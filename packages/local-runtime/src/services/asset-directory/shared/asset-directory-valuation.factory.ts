import type { AssetDirectoryValuation } from "@gold-insights/market-domain";

export class AssetDirectoryValuationFactory {
  public empty = (): AssetDirectoryValuation => ({
    marketCap: null,
    floatMarketCap: null,
    fullyDilutedValuation: null,
    turnover24h: null,
    marketCapRank: null,
    currency: null,
    source: null,
    updatedAt: null
  });
}
