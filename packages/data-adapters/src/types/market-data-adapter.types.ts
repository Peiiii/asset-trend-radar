import type { AssetSummary, OhlcvBar, Timeframe } from "@gold-insights/market-domain";

export type MarketDataRequest = {
  asset: AssetSummary;
  timeframe: Timeframe;
  limit: number;
};

export type MarketDataResponse = {
  asset: AssetSummary;
  bars: OhlcvBar[];
  rawRecords: unknown[];
  source: string;
};

export type MarketDataProvider = {
  fetchBars(request: MarketDataRequest): Promise<MarketDataResponse>;
};
