import type { ChartWallItem, ScannerEvent, WatchlistSummary } from "@gold-insights/market-domain";

export type WatchlistSummaryMetrics = {
  totalPinned: number;
  visibleItems: number;
  hiddenByFilters: number;
  positiveItems: number;
  strongTrendItems: number;
  eventfulItems: number;
};

export type WatchlistEvent = ScannerEvent & {
  assetName: string;
  symbol: string;
};

export function getWatchlistAssetIds(watchlists: WatchlistSummary[]): Set<string> {
  return new Set(watchlists.flatMap((watchlist) => watchlist.assets.map((asset) => asset.id)));
}

export function getWatchlistItems(chartItems: ChartWallItem[], watchlistAssetIds: Set<string>): ChartWallItem[] {
  return chartItems
    .filter((item) => watchlistAssetIds.has(item.id))
    .map((item) => ({ ...item, isPinned: true }))
    .sort((left, right) => right.trendScore - left.trendScore || left.name.localeCompare(right.name));
}

export function buildWatchlistSummary(items: ChartWallItem[], totalPinned: number): WatchlistSummaryMetrics {
  return {
    totalPinned,
    visibleItems: items.length,
    hiddenByFilters: Math.max(totalPinned - items.length, 0),
    positiveItems: items.filter((item) => (item.returnPct ?? 0) > 0).length,
    strongTrendItems: items.filter((item) => item.trendScore >= 60).length,
    eventfulItems: items.filter((item) => item.events.length > 0).length
  };
}

export function getTopWatchlistEvents(items: ChartWallItem[]): WatchlistEvent[] {
  return items
    .flatMap((item) => item.events.map((event) => ({
      ...event,
      assetName: item.name,
      symbol: item.symbol
    })))
    .sort((left, right) => right.severity - left.severity || right.triggeredAt - left.triggeredAt)
    .slice(0, 5);
}

export function trendTone(score: number): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (score >= 60) {
    return "positive";
  }

  if (score <= 35) {
    return "negative";
  }

  return "neutral";
}
