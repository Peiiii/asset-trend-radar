import type { CoinGeckoCryptoMarketItem, EastmoneyAshareCatalogItem } from "@gold-insights/data-adapters";
import type { AssetSummary, AssetValuation, ChartWallItem } from "@gold-insights/market-domain";
import type { AssetValuationNormalizationService } from "./asset-valuation-normalization.service";
import type { CryptoMarketValuationService } from "./valuation/crypto-market-valuation.service";
import type { EastmoneyAshareValuationService } from "./valuation/eastmoney-a-share-valuation.service";
import type { NasdaqAssetValuationService } from "./valuation/nasdaq-asset-valuation.service";

type ValuationLookup = {
  cryptoMarketsBySymbol: Map<string, CoinGeckoCryptoMarketItem>;
  aShareItemsBySymbol: Map<string, EastmoneyAshareCatalogItem>;
  usValuationsBySymbol: Map<string, AssetValuation>;
};

export class ChartWallValuationService {
  public constructor(
    private readonly cryptoMarketValuationService: CryptoMarketValuationService,
    private readonly aShareValuationService: EastmoneyAshareValuationService,
    private readonly nasdaqAssetValuationService: NasdaqAssetValuationService,
    private readonly normalizationService: AssetValuationNormalizationService
  ) {}

  public enrichForSort = async (items: ChartWallItem[], sort: string, includeValuations = false): Promise<ChartWallItem[]> => {
    if ((!includeValuations && sort !== "market_cap") || !this.hasSupportedAssets(items)) {
      return items;
    }

    const lookup = await this.loadLookup(items);

    const valuationEnrichedItems = items.map((item) => ({
      ...item,
      valuation: this.getValuation(item, lookup) ?? item.valuation
    }));

    return this.normalizationService.normalizeItems(valuationEnrichedItems);
  };

  public empty = (): AssetValuation => ({
    marketCap: null,
    floatMarketCap: null,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: null,
    source: null,
    updatedAt: null,
    normalized: null
  });

  private hasSupportedAssets = (items: ChartWallItem[]): boolean =>
    items.some((item) => item.assetType === "crypto" || this.isAshareEquity(item) || this.nasdaqAssetValuationService.isSupportedAsset(item));

  private loadLookup = async (items: ChartWallItem[]): Promise<ValuationLookup> => {
    const shouldLoadCrypto = items.some((item) => item.assetType === "crypto");
    const shouldLoadAshare = items.some(this.isAshareEquity);
    const usSymbols = items.filter(this.nasdaqAssetValuationService.isSupportedAsset).map(this.nasdaqAssetValuationService.getSymbolKey);
    const [cryptoResult, aShareResult, usValuationResult] = await Promise.allSettled([
      shouldLoadCrypto ? this.cryptoMarketValuationService.listMarketsBySymbol() : Promise.resolve(new Map<string, CoinGeckoCryptoMarketItem>()),
      shouldLoadAshare ? this.aShareValuationService.listItemsBySymbol() : Promise.resolve(new Map<string, EastmoneyAshareCatalogItem>()),
      usSymbols.length > 0 ? this.nasdaqAssetValuationService.listValuationsBySymbol(usSymbols) : Promise.resolve(new Map<string, AssetValuation>())
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
      aShareItemsBySymbol: aShareResult.status === "fulfilled" ? aShareResult.value : new Map(),
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

    if (this.nasdaqAssetValuationService.isSupportedAsset(asset)) {
      return lookup.usValuationsBySymbol.get(this.nasdaqAssetValuationService.getSymbolKey(asset)) ?? null;
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
    updatedAt: item.latestAt,
    normalized: null
  });

  private toAshareValuation = (item: EastmoneyAshareCatalogItem): AssetValuation => ({
    marketCap: item.marketCap,
    floatMarketCap: item.floatMarketCap,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt,
    normalized: null
  });

  private isAshareEquity = (asset: AssetSummary): boolean =>
    asset.market === "A 股" && asset.assetType === "equity";

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
}
