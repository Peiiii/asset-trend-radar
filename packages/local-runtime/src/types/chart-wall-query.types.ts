import type { ChartWallDataQualityFilter, ChartWallSortOrder, ChartWallValuationStatusFilter, Timeframe } from "@gold-insights/market-domain";

export type ChartWallQuery = {
  range: string;
  timeframe: Timeframe;
  keyword: string;
  universe: string;
  level: string;
  market: string;
  assetType: string;
  sort: string;
  order: ChartWallSortOrder;
  signal: string;
  tag: string;
  dataQuality: ChartWallDataQualityFilter;
  valuationStatus: ChartWallValuationStatusFilter;
  includeValuations: boolean;
  limit: number;
  offset: number;
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
