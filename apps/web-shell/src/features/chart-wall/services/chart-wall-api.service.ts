import type { AssetDetailResponse, ChartWallResponse, CompareResponse, DataHealthResponse, FundCatalogSummaryResponse, FundCatalogSyncResponse, FundImportResponse, FundSearchResponse, ScannerEventsResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";
import type { ChartWallFilters, ChartWallPageData } from "@/shared/types/api.types";

export class ChartWallApiService {
  public fetchPageData = async (filters: ChartWallFilters, signal?: AbortSignal): Promise<ChartWallPageData> => {
    const query = new URLSearchParams(filters).toString();
    const [chartWall, dataHealth, universeTree, scannerEvents, watchlists, fundCatalog] = await Promise.all([
      this.fetchJson<ChartWallResponse>(`/api/chart-wall?${query}`, signal),
      this.fetchJson<DataHealthResponse>("/api/data-health", signal),
      this.fetchJson<UniverseTreeResponse>("/api/universe/tree", signal),
      this.fetchJson<ScannerEventsResponse>("/api/scanner/events?universe=global&eventType=all", signal),
      this.fetchJson<WatchlistsResponse>("/api/watchlists", signal),
      this.fetchJson<FundCatalogSummaryResponse>("/api/funds/eastmoney/catalog/summary", signal)
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

  public searchEastmoneyFunds = async (keyword: string): Promise<FundSearchResponse> =>
    this.fetchJson<FundSearchResponse>(`/api/funds/eastmoney/search?keyword=${encodeURIComponent(keyword)}&limit=24`);

  public syncEastmoneyFundCatalog = async (): Promise<FundCatalogSyncResponse> =>
    this.fetchJson<FundCatalogSyncResponse>("/api/funds/eastmoney/catalog/sync", {
      method: "POST"
    });

  public importEastmoneyFund = async (code: string): Promise<FundImportResponse> =>
    this.fetchJson<FundImportResponse>("/api/funds/eastmoney/import", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ code })
    });

  public refresh = async (): Promise<void> => {
    const response = await fetch("/api/refresh", { method: "POST" });

    if (!response.ok) {
      throw new Error(`刷新失败: ${response.status}`);
    }
  };

  public addWatchlistAsset = async (assetId: string): Promise<WatchlistsResponse> =>
    this.fetchJson<WatchlistsResponse>("/api/watchlists/default/assets", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ assetId })
    });

  public removeWatchlistAsset = async (assetId: string): Promise<WatchlistsResponse> =>
    this.fetchJson<WatchlistsResponse>(`/api/watchlists/default/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE"
    });

  private fetchJson = async <TData,>(url: string, initOrSignal?: RequestInit | AbortSignal): Promise<TData> => {
    const init = initOrSignal instanceof AbortSignal ? { signal: initOrSignal } : initOrSignal;
    const response = await fetch(url, init);

    if (!response.ok) {
      throw new Error(`接口请求失败: ${response.status}`);
    }

    return (await response.json()) as TData;
  };
}

export const chartWallApiService = new ChartWallApiService();
