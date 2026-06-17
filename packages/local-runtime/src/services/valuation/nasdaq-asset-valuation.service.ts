import type { NasdaqUsEquityValuationItem, NasdaqUsEquityValuationProvider } from "@gold-insights/data-adapters";
import type { AssetType, AssetValuation } from "@gold-insights/market-domain";

type NasdaqValuationCandidate = {
  symbol: string;
  vendorSymbol?: string;
  market: string;
  assetType: AssetType;
  currency: string;
};

export class NasdaqAssetValuationService {
  public constructor(private readonly valuationProvider: NasdaqUsEquityValuationProvider) {}

  public isSupportedAsset = (asset: NasdaqValuationCandidate): boolean => {
    if (asset.market === "美股" && (asset.assetType === "equity" || asset.assetType === "fund")) {
      return this.canRequestSummary(this.getSymbolKey(asset));
    }

    return asset.assetType === "fund" && this.isUsdLikeCurrency(asset.currency) && this.canRequestSummary(this.getSymbolKey(asset));
  };

  public listValuationsBySymbol = async (symbols: string[]): Promise<Map<string, AssetValuation>> => {
    const valuationItemsBySymbol = await this.valuationProvider.listValuationsForSymbols(symbols);
    return new Map([...valuationItemsBySymbol].map(([symbol, item]) => [symbol, this.toAssetValuation(item)]));
  };

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
