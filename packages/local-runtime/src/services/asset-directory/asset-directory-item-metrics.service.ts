import type { SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategoryId, AssetDirectoryItem, AssetSummary, OhlcvBar } from "@gold-insights/market-domain";
import { filterByCalendarRange, getRangeFetchLimit, toIsoDateTime } from "@gold-insights/market-domain";
import { getReturnPct } from "@gold-insights/scanner-engine";

export class AssetDirectoryItemMetricsService {
  public constructor(private readonly marketDataRepository: SqliteMarketDataRepository) {}

  public toInPoolItem = (categoryId: AssetDirectoryCategoryId, asset: AssetSummary): AssetDirectoryItem => {
    const bars = this.marketDataRepository.listBars(asset.id, "1d", getRangeFetchLimit("1y", "1d"));
    const latestBar = bars.at(-1) ?? null;

    return {
      id: `${categoryId}:${asset.id}`,
      categoryId,
      label: asset.name,
      symbol: asset.symbol,
      market: asset.market,
      assetType: asset.assetType,
      provider: asset.dataSource ?? "unknown",
      exchange: asset.exchange,
      currency: asset.currency,
      latestValue: latestBar?.close ?? null,
      latestValueLabel: asset.assetType === "index" ? "最新点位" : "最新价",
      latestValueAt: toIsoDateTime(latestBar?.ts ?? null),
      returns: {
        return1d: getReturnPct(bars, 1),
        return1m: this.getCalendarReturn(bars, "1m"),
        return3m: this.getCalendarReturn(bars, "3m"),
        return6m: this.getCalendarReturn(bars, "6m"),
        return1y: this.getCalendarReturn(bars, "1y")
      },
      poolState: "in_pool",
      dataState: bars.length > 0 ? "full_history" : "missing",
      dataPointCount: bars.length,
      assetId: asset.id,
      tags: asset.tags ?? []
    };
  };

  private getCalendarReturn = (bars: OhlcvBar[], range: string): number | null => {
    const visibleBars = filterByCalendarRange(bars, range);
    const first = visibleBars[0];
    const latest = visibleBars.at(-1);

    if (!first || !latest || first.close === 0 || first.ts === latest.ts) {
      return null;
    }

    return ((latest.close - first.close) / first.close) * 100;
  };
}
