import type { AssetDetailResponse, AssetDirectoryImportResponse, AssetDirectoryPageResponse, ChartWallResponse, CompareResponse, DataHealthResponse, FundCatalogPageResponse, FundCatalogSummaryResponse, FundCatalogSyncResponse, FundImportResponse, FundSearchResponse, RuntimeTaskStartResponse, ScannerEventsResponse, TaskCenterResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";
import type { AssetDirectoryPageFilters, ChartWallFilters, ChartWallPageData, FundCatalogPageFilters } from "@/shared/types/api.types";

type CachedJsonEntry<TData> = {
  expiresAt: number;
  promise: Promise<TData>;
};

export class ChartWallApiService {
  private readonly pageDataTtlMs = 15_000;
  private readonly pageDataCache = new Map<string, CachedJsonEntry<unknown>>();

  public fetchPageData = async (filters: ChartWallFilters, signal?: AbortSignal): Promise<ChartWallPageData> => {
    const query = this.toChartWallQuery(filters);
    const [chartWall, dataHealth, universeTree, scannerEvents, watchlists, fundCatalog] = await Promise.all([
      this.fetchJson<ChartWallResponse>(`/api/chart-wall?${query}`, signal),
      this.fetchCachedPageData<DataHealthResponse>("data-health", "/api/data-health"),
      this.fetchCachedPageData<UniverseTreeResponse>("universe-tree", "/api/universe/tree"),
      this.fetchCachedPageData<ScannerEventsResponse>("scanner-events", "/api/scanner/events?universe=global&eventType=all"),
      this.fetchCachedPageData<WatchlistsResponse>("watchlists", "/api/watchlists"),
      this.fetchCachedPageData<FundCatalogSummaryResponse>("fund-catalog-summary", "/api/funds/eastmoney/catalog/summary")
    ]);

    return {
      chartWall,
      dataHealth,
      universeTree,
      scannerEvents,
      watchlists,
      fundCatalog
    };
  };

  public fetchCompare = async (assetIds: string[], range: string, timeframe: string): Promise<CompareResponse> =>
    this.fetchJson<CompareResponse>(`/api/compare?assetIds=${encodeURIComponent(assetIds.join(","))}&range=${encodeURIComponent(range)}&timeframe=${encodeURIComponent(timeframe)}`);

  public fetchAssetDetail = async (assetId: string, range: string, timeframe: string, signal?: AbortSignal): Promise<AssetDetailResponse> =>
    this.fetchJson<AssetDetailResponse>(`/api/assets/${encodeURIComponent(assetId)}/detail?range=${encodeURIComponent(range)}&timeframe=${encodeURIComponent(timeframe)}`, signal);

  public fetchTaskCenter = async (signal?: AbortSignal): Promise<TaskCenterResponse> =>
    this.fetchJson<TaskCenterResponse>("/api/tasks?limit=80", signal);

  public fetchFundCatalogPage = async (filters: FundCatalogPageFilters, signal?: AbortSignal): Promise<FundCatalogPageResponse> => {
    const query = new URLSearchParams({
      keyword: filters.keyword,
      fundType: filters.fundType,
      status: filters.status,
      dataState: filters.dataState,
      sort: filters.sort,
      order: filters.order,
      limit: String(filters.limit),
      offset: String(filters.offset)
    }).toString();

    return this.fetchJson<FundCatalogPageResponse>(`/api/funds/eastmoney/catalog?${query}`, signal);
  };

  public fetchAssetDirectoryPage = async (filters: AssetDirectoryPageFilters, signal?: AbortSignal): Promise<AssetDirectoryPageResponse> => {
    const query = new URLSearchParams({
      keyword: filters.keyword,
      market: filters.market,
      assetType: filters.assetType,
      dataState: filters.dataState,
      valuationStatus: filters.valuationStatus,
      status: filters.status,
      sort: filters.sort,
      order: filters.order,
      limit: String(filters.limit),
      offset: String(filters.offset)
    }).toString();

    return this.fetchJson<AssetDirectoryPageResponse>(`/api/directories/${encodeURIComponent(filters.categoryId)}/items?${query}`, signal);
  };

  public importAssetDirectoryItem = async (categoryId: string, itemId: string): Promise<AssetDirectoryImportResponse> => {
    this.clearCachedPageData();
    return this.fetchJson<AssetDirectoryImportResponse>(`/api/directories/${encodeURIComponent(categoryId)}/items/${encodeURIComponent(itemId)}/import`, {
      method: "POST"
    });
  };

  public searchEastmoneyFunds = async (keyword: string): Promise<FundSearchResponse> =>
    this.fetchJson<FundSearchResponse>(`/api/funds/eastmoney/search?keyword=${encodeURIComponent(keyword)}&limit=24`);

  public syncEastmoneyFundCatalog = async (): Promise<FundCatalogSyncResponse> => {
    this.clearCachedPageData();
    return this.fetchJson<FundCatalogSyncResponse>("/api/funds/eastmoney/catalog/sync", {
      method: "POST"
    });
  };

  public importEastmoneyFund = async (code: string): Promise<FundImportResponse> => {
    this.clearCachedPageData();
    return this.fetchJson<FundImportResponse>("/api/funds/eastmoney/import", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ code })
    });
  };

  public refresh = async (): Promise<void> => {
    this.clearCachedPageData();
    const response = await fetch("/api/refresh", { method: "POST" });

    if (!response.ok) {
      throw new Error(`刷新失败: ${response.status}`);
    }
  };

  public startRefresh = async (): Promise<RuntimeTaskStartResponse> => {
    this.clearCachedPageData();
    return this.fetchJson<RuntimeTaskStartResponse>("/api/refresh/start", {
      method: "POST"
    });
  };

  public addWatchlistAsset = async (assetId: string): Promise<WatchlistsResponse> => {
    this.clearCachedPageData("watchlists");
    return this.fetchJson<WatchlistsResponse>("/api/watchlists/default/assets", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ assetId })
    });
  };

  public removeWatchlistAsset = async (assetId: string): Promise<WatchlistsResponse> => {
    this.clearCachedPageData("watchlists");
    return this.fetchJson<WatchlistsResponse>(`/api/watchlists/default/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE"
    });
  };

  private toChartWallQuery = (filters: ChartWallFilters): string => {
    const query = new URLSearchParams({
      range: filters.range,
      timeframe: filters.timeframe,
      q: filters.keyword,
      universe: filters.universe,
      level: filters.level,
      market: filters.market,
      assetType: filters.assetType,
      sort: filters.sort,
      order: filters.order,
      signal: filters.signal,
      tag: filters.tag,
      dataQuality: filters.dataQuality,
      valuationStatus: filters.valuationStatus,
      limit: String(filters.limit),
      offset: String(filters.offset)
    });

    if (filters.includeValuations) {
      query.set("includeValuations", "true");
    }

    return query.toString();
  };

  private fetchJson = async <TData,>(url: string, initOrSignal?: RequestInit | AbortSignal): Promise<TData> => {
    const init = initOrSignal instanceof AbortSignal ? { signal: initOrSignal } : initOrSignal;
    const response = await fetch(url, init);

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    return (await response.json()) as TData;
  };

  private fetchCachedPageData = async <TData,>(key: string, url: string): Promise<TData> => {
    const now = Date.now();
    const cached = this.pageDataCache.get(key) as CachedJsonEntry<TData> | undefined;

    if (cached && cached.expiresAt > now) {
      return cached.promise;
    }

    const entry: CachedJsonEntry<TData> = {
      expiresAt: now + this.pageDataTtlMs,
      promise: this.fetchJson<TData>(url).catch((error: unknown) => {
        this.pageDataCache.delete(key);
        throw error;
      })
    };
    this.pageDataCache.set(key, entry);
    return entry.promise;
  };

  private clearCachedPageData = (...keys: string[]): void => {
    if (keys.length === 0) {
      this.pageDataCache.clear();
      return;
    }

    for (const key of keys) {
      this.pageDataCache.delete(key);
    }
  };

  private getErrorMessage = async (response: Response): Promise<string> => {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message ?? `接口请求失败: ${response.status}`;
    } catch {
      return `接口请求失败: ${response.status}`;
    }
  };
}

export const chartWallApiService = new ChartWallApiService();
