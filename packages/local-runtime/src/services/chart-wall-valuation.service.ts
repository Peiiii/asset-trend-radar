import type { CoinGeckoCryptoMarketItem, CoinGeckoCryptoMarketsProvider, EastmoneyAshareCatalogItem, EastmoneyAshareCatalogProvider, NasdaqUsEquityValuationItem, NasdaqUsEquityValuationProvider } from "@gold-insights/data-adapters";
import type { AssetSummary, AssetValuation, ChartWallItem } from "@gold-insights/market-domain";

type ValuationLookup = {
  cryptoMarketsBySymbol: Map<string, CoinGeckoCryptoMarketItem>;
  aShareItemsBySymbol: Map<string, EastmoneyAshareCatalogItem>;
  usValuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>;
};

export class ChartWallValuationService {
  public constructor(
    private readonly cryptoMarketsProvider: CoinGeckoCryptoMarketsProvider,
    private readonly aShareCatalogProvider: EastmoneyAshareCatalogProvider,
    private readonly usEquityValuationProvider: NasdaqUsEquityValuationProvider
  ) {}

  public enrichForSort = async (items: ChartWallItem[], sort: string): Promise<ChartWallItem[]> => {
    if (sort !== "market_cap" || !this.hasSupportedAssets(items)) {
      return items;
    }

    const lookup = await this.loadLookup(items);

    return items.map((item) => ({
      ...item,
      valuation: this.getValuation(item, lookup) ?? item.valuation
    }));
  };

  public empty = (): AssetValuation => ({
    marketCap: null,
    floatMarketCap: null,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: null,
    source: null,
    updatedAt: null
  });

  private hasSupportedAssets = (items: ChartWallItem[]): boolean =>
    items.some((item) => item.assetType === "crypto" || this.isAshareEquity(item) || this.isUsValuationAsset(item));

  private loadLookup = async (items: ChartWallItem[]): Promise<ValuationLookup> => {
    const shouldLoadCrypto = items.some((item) => item.assetType === "crypto");
    const shouldLoadAshare = items.some(this.isAshareEquity);
    const usSymbols = items.filter(this.isUsValuationAsset).map((item) => item.vendorSymbol ?? item.symbol);
    const [cryptoResult, aShareResult, usValuationResult] = await Promise.allSettled([
      shouldLoadCrypto ? this.cryptoMarketsProvider.listMarketsBySymbol() : Promise.resolve(new Map<string, CoinGeckoCryptoMarketItem>()),
      shouldLoadAshare ? this.aShareCatalogProvider.listCatalog() : Promise.resolve([]),
      usSymbols.length > 0 ? this.usEquityValuationProvider.listValuationsForSymbols(usSymbols) : Promise.resolve(new Map<string, NasdaqUsEquityValuationItem>())
    ]);

    if (cryptoResult.status === "rejected") {
      console.warn(cryptoResult.reason);
    }

    if (aShareResult.status === "rejected") {
      console.warn(aShareResult.reason);
    }

    if (usValuationResult.status === "rejected") {
      console.warn(usValuationResult.reason);
    }

    return {
      cryptoMarketsBySymbol: cryptoResult.status === "fulfilled" ? cryptoResult.value : new Map(),
      aShareItemsBySymbol: aShareResult.status === "fulfilled" ? this.toAshareItemsBySymbol(aShareResult.value) : new Map(),
      usValuationsBySymbol: usValuationResult.status === "fulfilled" ? usValuationResult.value : new Map()
    };
  };

  private getValuation = (asset: AssetSummary, lookup: ValuationLookup): AssetValuation | null => {
    if (asset.assetType === "crypto") {
      const marketItem = lookup.cryptoMarketsBySymbol.get(this.getCryptoBaseSymbol(asset));
      return marketItem ? this.toCryptoValuation(marketItem) : null;
    }

    if (this.isAshareEquity(asset)) {
      const catalogItem = lookup.aShareItemsBySymbol.get(this.normalizeSymbol(asset.vendorSymbol ?? asset.symbol));
      return catalogItem ? this.toAshareValuation(catalogItem) : null;
    }

    if (this.isUsValuationAsset(asset)) {
      const valuationItem = lookup.usValuationsBySymbol.get(this.normalizeUsSymbol(asset.vendorSymbol ?? asset.symbol));
      return valuationItem ? this.toUsValuation(valuationItem) : null;
    }

    return null;
  };

  private toCryptoValuation = (item: CoinGeckoCryptoMarketItem): AssetValuation => ({
    marketCap: item.marketCap,
    floatMarketCap: null,
    fullyDilutedValuation: item.fullyDilutedValuation,
    turnover24h: item.turnover24h,
    marketCapRank: item.marketCapRank,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt
  });

  private toAshareValuation = (item: EastmoneyAshareCatalogItem): AssetValuation => ({
    marketCap: item.marketCap,
    floatMarketCap: item.floatMarketCap,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt
  });

  private toUsValuation = (item: NasdaqUsEquityValuationItem): AssetValuation => ({
    marketCap: item.marketCap,
    floatMarketCap: null,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt
  });

  private toAshareItemsBySymbol = (items: EastmoneyAshareCatalogItem[]): Map<string, EastmoneyAshareCatalogItem> =>
    new Map(items.map((item) => [this.normalizeSymbol(item.yahooSymbol), item]));

  private isAshareEquity = (asset: AssetSummary): boolean =>
    asset.market === "A 股" && asset.assetType === "equity";

  private isUsValuationAsset = (asset: AssetSummary): boolean =>
    asset.market === "美股" && (asset.assetType === "equity" || asset.assetType === "fund");

  private getCryptoBaseSymbol = (asset: AssetSummary): string => {
    const candidates = [asset.symbol, asset.vendorSymbol ?? "", asset.id];

    for (const candidate of candidates) {
      const normalized = this.normalizeCryptoSymbol(candidate);

      if (normalized.length > 0) {
        return normalized;
      }
    }

    return "";
  };

  private normalizeCryptoSymbol = (value: string): string => {
    const upper = value.toUpperCase().trim();

    if (upper.includes("/")) {
      return this.normalizeSymbol(upper.split("/")[0]);
    }

    if (upper.endsWith("-USD")) {
      return this.normalizeSymbol(upper.slice(0, -4));
    }

    if (upper.endsWith("USDT")) {
      return this.normalizeSymbol(upper.slice(0, -4));
    }

    if (upper.endsWith("USD")) {
      return this.normalizeSymbol(upper.slice(0, -3));
    }

    return this.normalizeSymbol(upper);
  };

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  private normalizeUsSymbol = (value: string): string =>
    value.toUpperCase().replace(/[./]/g, "-").replace(/[^A-Z0-9-]/g, "");
}
