import type { FundCatalogPageRecord, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { FundCatalogEntry, FundCatalogPageItem, OhlcvBar } from "@gold-insights/market-domain";
import { dayMs, toIsoDateTime } from "@gold-insights/market-domain";

type ImportedFundCatalogMetrics = Omit<FundCatalogPageItem, keyof FundCatalogEntry | "assetId" | "isImported" | "metricSource">;

export class FundCatalogPageItemFactory {
  public constructor(
    private readonly historyLimit: number,
    private readonly marketDataRepository: SqliteMarketDataRepository
  ) {}

  public toPageItems = (records: FundCatalogPageRecord[]): FundCatalogPageItem[] => {
    const metricsByAssetId = this.getImportedMetrics(records.filter((item) => item.assetId).map((item) => String(item.assetId)));
    return records.map((record) => this.toCatalogPageItem(record, metricsByAssetId.get(record.assetId ?? "")));
  };

  private getImportedMetrics = (assetIds: string[]): Map<string, ImportedFundCatalogMetrics> => {
    const metricsByAssetId = new Map<string, ImportedFundCatalogMetrics>();

    for (const assetId of assetIds) {
      const bars = this.marketDataRepository.listBars(assetId, "1d", this.historyLimit);
      const latestBar = bars.at(-1) ?? null;

      metricsByAssetId.set(assetId, {
        dataPointCount: bars.length,
        latestNav: latestBar?.close ?? null,
        latestNavDate: latestBar ? new Date(latestBar.ts).toISOString().slice(0, 10) : null,
        latestBarAt: toIsoDateTime(latestBar?.ts ?? null),
        return1d: this.getPreviousBarReturn(bars),
        return1w: this.getCalendarReturn(bars, 7),
        return1m: this.getCalendarReturn(bars, 30),
        return3m: this.getCalendarReturn(bars, 90),
        return6m: this.getCalendarReturn(bars, 180),
        return1y: this.getCalendarReturn(bars, 365)
      });
    }

    return metricsByAssetId;
  };

  private toCatalogPageItem = (entry: FundCatalogPageRecord, metrics?: ImportedFundCatalogMetrics): FundCatalogPageItem => ({
    ...entry,
    isImported: Boolean(entry.assetId),
    metricSource: entry.metricUpdatedAt ? "catalog_snapshot" : metrics ? "local_bars" : null,
    dataPointCount: metrics?.dataPointCount ?? 0,
    latestNav: entry.latestNav ?? metrics?.latestNav ?? null,
    latestNavDate: entry.latestNavDate ?? metrics?.latestNavDate ?? null,
    latestBarAt: metrics?.latestBarAt ?? null,
    return1d: entry.return1d ?? metrics?.return1d ?? null,
    return1w: entry.return1w ?? metrics?.return1w ?? null,
    return1m: entry.return1m ?? metrics?.return1m ?? null,
    return3m: entry.return3m ?? metrics?.return3m ?? null,
    return6m: entry.return6m ?? metrics?.return6m ?? null,
    return1y: entry.return1y ?? metrics?.return1y ?? null
  });

  private getPreviousBarReturn = (bars: OhlcvBar[]): number | null => {
    const latestBar = bars.at(-1);
    const previousBar = bars.at(-2);

    if (!latestBar || !previousBar || previousBar.close === 0) {
      return null;
    }

    return ((latestBar.close - previousBar.close) / previousBar.close) * 100;
  };

  private getCalendarReturn = (bars: OhlcvBar[], days: number): number | null => {
    const latestBar = bars.at(-1);

    if (!latestBar) {
      return null;
    }

    const targetTs = latestBar.ts - days * dayMs;
    const baseBar = bars.find((bar) => bar.ts >= targetTs) ?? null;

    if (!baseBar || baseBar.ts === latestBar.ts || baseBar.close === 0) {
      return null;
    }

    return ((latestBar.close - baseBar.close) / baseBar.close) * 100;
  };
}
