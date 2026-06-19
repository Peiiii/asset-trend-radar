import type { NasdaqUsEquityValuationItem, NasdaqUsEquityValuationProvider } from "@gold-insights/data-adapters";
import type { SqliteProviderSnapshotRepository } from "@gold-insights/data-storage";
import type { AssetType, AssetValuation } from "@gold-insights/market-domain";

type NasdaqValuationCandidate = {
  symbol: string;
  vendorSymbol?: string;
  market: string;
  assetType: AssetType;
  currency: string;
};

type NasdaqAssetValuationSnapshotPayload = {
  item: NasdaqUsEquityValuationItem;
};

export class NasdaqAssetValuationService {
  private readonly snapshotKeyPrefix = "valuation:nasdaq-us-equity:v1:";
  private readonly refreshTtlMs = 5 * 60 * 1000;
  private readonly refreshRequestsBySymbol = new Map<string, Promise<void>>();

  public constructor(
    private readonly valuationProvider: NasdaqUsEquityValuationProvider,
    private readonly snapshotRepository?: SqliteProviderSnapshotRepository
  ) {}

  public isSupportedAsset = (asset: NasdaqValuationCandidate): boolean => {
    if (asset.market === "美股" && (asset.assetType === "equity" || asset.assetType === "fund")) {
      return this.canRequestSummary(this.getSymbolKey(asset));
    }

    return asset.assetType === "fund" && this.isUsdLikeCurrency(asset.currency) && this.canRequestSummary(this.getSymbolKey(asset));
  };

  public listValuationsBySymbol = async (symbols: string[]): Promise<Map<string, AssetValuation>> => {
    const normalizedSymbols = this.normalizeSymbolList(symbols);
    const snapshotsBySymbol = this.listSnapshotItemsBySymbol(normalizedSymbols);
    const missingSymbols = normalizedSymbols.filter((symbol) => !snapshotsBySymbol.has(symbol));

    if (missingSymbols.length === 0 && snapshotsBySymbol.size > 0) {
      this.refreshStaleSnapshots(normalizedSymbols, snapshotsBySymbol);
      return this.toAssetValuationsBySymbol(snapshotsBySymbol);
    }

    let valuationItemsBySymbol: Map<string, NasdaqUsEquityValuationItem>;

    try {
      valuationItemsBySymbol = await this.valuationProvider.listValuationsForSymbols(missingSymbols);
    } catch (error) {
      if (snapshotsBySymbol.size > 0) {
        console.warn(error);
        return this.toAssetValuationsBySymbol(snapshotsBySymbol);
      }

      throw error;
    }

    this.saveSnapshotItems(valuationItemsBySymbol);
    const mergedItemsBySymbol = new Map([...snapshotsBySymbol].map(([symbol, snapshot]) => [symbol, snapshot.item]));

    for (const [symbol, item] of valuationItemsBySymbol) {
      mergedItemsBySymbol.set(this.normalizeUsSymbol(symbol), item);
    }

    this.refreshStaleSnapshots(normalizedSymbols, snapshotsBySymbol);
    return this.toAssetValuationsBySymbol(mergedItemsBySymbol);
  };

  private refreshStaleSnapshots = (symbols: string[], snapshotsBySymbol: Map<string, { item: NasdaqUsEquityValuationItem; updatedAt: number }>): void => {
    const staleSymbols = symbols.filter((symbol) => {
      const snapshot = snapshotsBySymbol.get(symbol);
      return snapshot && Date.now() - snapshot.updatedAt > this.refreshTtlMs && !this.refreshRequestsBySymbol.has(symbol);
    });

    if (staleSymbols.length === 0) {
      return;
    }

    const request = this.valuationProvider.listValuationsForSymbols(staleSymbols)
      .then(this.saveSnapshotItems)
      .catch((error) => {
        console.warn(error);
      })
      .finally(() => {
        for (const symbol of staleSymbols) {
          this.refreshRequestsBySymbol.delete(symbol);
        }
      });

    for (const symbol of staleSymbols) {
      this.refreshRequestsBySymbol.set(symbol, request);
    }
  };

  private toAssetValuationsBySymbol = (valuationItemsBySymbol: Map<string, NasdaqUsEquityValuationItem> | Map<string, { item: NasdaqUsEquityValuationItem }>): Map<string, AssetValuation> =>
    new Map([...valuationItemsBySymbol].map(([symbol, value]) => [symbol, this.toAssetValuation("item" in value ? value.item : value)]));

  private listSnapshotItemsBySymbol = (symbols: string[]): Map<string, { item: NasdaqUsEquityValuationItem; updatedAt: number }> => {
    if (!this.snapshotRepository) {
      return new Map();
    }

    const entries = symbols.flatMap((symbol) => {
      const snapshot = this.snapshotRepository?.getSnapshot<NasdaqAssetValuationSnapshotPayload>(this.getSnapshotKey(symbol));

      if (!snapshot || !this.isSnapshotPayload(snapshot.payload)) {
        return [];
      }

      return [[symbol, { item: snapshot.payload.item, updatedAt: snapshot.updatedAt }] as const];
    });

    return new Map(entries);
  };

  private saveSnapshotItems = (itemsBySymbol: Map<string, NasdaqUsEquityValuationItem>): void => {
    if (!this.snapshotRepository) {
      return;
    }

    for (const [symbol, item] of itemsBySymbol) {
      this.snapshotRepository.upsertSnapshot(this.getSnapshotKey(this.normalizeUsSymbol(symbol)), { item } satisfies NasdaqAssetValuationSnapshotPayload);
    }
  };

  private isSnapshotPayload = (payload: unknown): payload is NasdaqAssetValuationSnapshotPayload =>
    Boolean(payload && typeof payload === "object" && "item" in payload);

  private getSnapshotKey = (symbol: string): string =>
    `${this.snapshotKeyPrefix}${symbol}`;

  private normalizeSymbolList = (symbols: string[]): string[] =>
    [...new Set(symbols.map(this.normalizeUsSymbol).filter((symbol) => this.canRequestSummary(symbol)))];

  public getSymbolKey = (asset: Pick<NasdaqValuationCandidate, "symbol" | "vendorSymbol">): string =>
    this.normalizeUsSymbol(asset.vendorSymbol ?? asset.symbol);

  public toAssetValuation = (item: NasdaqUsEquityValuationItem): AssetValuation => ({
    marketCap: item.marketCap,
    floatMarketCap: null,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt,
    normalized: null
  });

  private canRequestSummary = (symbol: string): boolean =>
    /^[A-Z0-9-]{1,12}$/.test(symbol);

  private normalizeUsSymbol = (value: string): string =>
    value.toUpperCase().replace(/[./]/g, "-").replace(/[^A-Z0-9-]/g, "");

  private isUsdLikeCurrency = (value: string): boolean => {
    const currency = value.trim().toUpperCase();
    return currency === "USD" || currency === "USDT" || currency === "USDC";
  };
}
