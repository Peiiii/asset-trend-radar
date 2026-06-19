import type { AssetSummary, ChartWallItem, Timeframe } from "@gold-insights/market-domain";

type ChartWallItemCacheEntry = {
  cachedAt: number;
  itemsByAssetId: Map<string, ChartWallItem>;
};

type ChartWallItemCacheRequest = {
  assets: AssetSummary[];
  dataVersion: string;
  range: string;
  timeframe: Timeframe;
  buildItem(asset: AssetSummary): ChartWallItem;
};

export class ChartWallItemCacheService {
  private readonly ttlMs = 30_000;
  private readonly maxEntries = 8;
  private readonly entries = new Map<string, ChartWallItemCacheEntry>();

  public getItemsByAssetId = (request: ChartWallItemCacheRequest): Map<string, ChartWallItem> => {
    const key = this.toCacheKey(request);
    const cachedEntry = this.entries.get(key);
    const now = Date.now();

    if (cachedEntry && now - cachedEntry.cachedAt <= this.ttlMs) {
      this.entries.delete(key);
      this.entries.set(key, cachedEntry);
      return cachedEntry.itemsByAssetId;
    }

    const entry = {
      cachedAt: now,
      itemsByAssetId: new Map(request.assets.map((asset) => [asset.id, request.buildItem(asset)]))
    };
    this.entries.set(key, entry);
    this.prune();
    return entry.itemsByAssetId;
  };

  private prune = (): void => {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (!oldestKey) {
        return;
      }

      this.entries.delete(oldestKey);
    }
  };

  private toCacheKey = (request: ChartWallItemCacheRequest): string =>
    [
      request.timeframe,
      request.range,
      request.dataVersion,
      request.assets.map((asset) => asset.id).join(",")
    ].join("|");
}
