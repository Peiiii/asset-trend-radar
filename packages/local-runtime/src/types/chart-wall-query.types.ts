import type { ChartWallSortOrder, Timeframe } from "@gold-insights/market-domain";

export type ChartWallQuery = {
  range: string;
  timeframe: Timeframe;
  universe: string;
  level: string;
  market: string;
  assetType: string;
  sort: string;
  order: ChartWallSortOrder;
  signal: string;
};

export type AssetBarsQuery = {
  assetId: string;
  range: string;
  timeframe: Timeframe;
};

export type ScannerEventsQuery = {
  universe: string;
  eventType: string;
};

export type CompareQuery = {
  assetIds: string[];
  range: string;
  timeframe: Timeframe;
};
