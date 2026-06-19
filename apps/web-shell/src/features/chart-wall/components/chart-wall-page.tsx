import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bitcoin,
  BookOpen,
  Database,
  FolderOpen,
  Gauge,
  LineChart,
  ListChecks,
  Network,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, Button, ErrorState, IconButton, LoadingState, RangePicker, TimeframePicker } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { AssetDirectoryAssetTypeFilter, AssetDirectoryCategoryId, AssetDirectoryCoverage, AssetDirectoryDataStateFilter, AssetDirectoryItem, AssetDirectorySortKey, AssetDirectoryStatusFilter, AssetDirectoryValuationStatusFilter, ChartWallDataQualityFilter, ChartWallSortOrder, ChartWallValuationStatusFilter } from "@gold-insights/market-domain";
import type { ChartWallFilters, ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { assetTypeFallbackOptions, chartWallPageSizeOptions, dataQualityFallbackOptions, defaultFilters, levelFallbackOptions, marketFallbackOptions, shouldIncludeChartWallValuations, signalFallbackOptions, sortOptions, sortOrderOptions, tagFallbackOptions, valuationStatusFallbackOptions } from "../configs/chart-wall-page.config";
import { ActiveFilterChips } from "./active-filter-chips/active-filter-chips";
import { AssetDetailSection } from "./asset-detail-section/asset-detail-section";
import { AssetDirectoryView } from "./asset-directory-section/asset-directory-view";
import { ChartGrid } from "./chart-grid/chart-grid";
import { ComparePanel } from "./compare-panel/compare-panel";
import { ChartWallControls, type ChartWallViewMode } from "./chart-wall-controls/chart-wall-controls";
import { ChartWallPagination } from "./chart-wall-pagination/chart-wall-pagination";
import { DataHealthSection } from "./data-health-section/data-health-section";
import { getAssetDirectoryTableSizing } from "./directory-table/directory-table-sizing.config";
import { ExchangeTable } from "./exchange-table/exchange-table";
import { FundDirectorySection } from "./fund-directory-section";
import "./market-chart-primitives.css";
import { OverviewSection } from "./overview-section/overview-section";
import { QueryStatus } from "./query-status/query-status";
import { ScannerSection } from "./scanner-section/scanner-section";
import { StrategyPresetStrip, type StrategyPresetFilters } from "./strategy-preset-strip/strategy-preset-strip";
import { TaskActivityNotice } from "./task-center/task-activity-notice";
import { TaskCenterSection } from "./task-center/task-center-section";
import { TaskStatusButton } from "./task-center/task-status-button";
import { UniverseSection } from "./universe-section/universe-section";
import { ValuationCoverageSummary } from "./valuation-coverage-summary/valuation-coverage-summary";
import { WatchlistSection } from "./watchlist-section/watchlist-section";
import { chartWallApiService } from "../services/chart-wall-api.service";
import { useAssetDirectoryQuery } from "../hooks/use-asset-directory-query";
import { useFundDirectoryQuery } from "../hooks/use-fund-directory-query";
import { useAssetDetailQuery } from "../hooks/use-asset-detail-query";
import { useChartWallQuery } from "../hooks/use-chart-wall-query";
import { useCompareSelection } from "../hooks/use-compare-selection";
import { useFundDirectoryUrlState } from "../hooks/use-fund-directory-url-state";
import { useTaskActions } from "../hooks/use-task-actions";
import { useTaskCenterQuery } from "../hooks/use-task-center-query";

type ActiveView = "overview" | "chart-wall" | "fund-directory" | "asset-directory" | "universe" | "scanner" | "asset-detail" | "watchlist" | "tasks" | "data-health";

const viewTitles: Record<ActiveView, string> = {
  overview: "全市场概览",
  "chart-wall": "全市场图表墙",
  "fund-directory": "基金目录",
  "asset-directory": "资产目录",
  universe: "资产宇宙",
  scanner: "机会扫描",
  "asset-detail": "资产详情",
  watchlist: "自选图表墙",
  tasks: "任务中心",
  "data-health": "数据源与任务状态"
};

const assetDirectoryLimit = 50;
const defaultChartWallPageSize = 120;

export function ChartWallPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const chartWallSectionRef = useRef<HTMLElement | null>(null);
  const { assetId: routeAssetId } = useParams<{ assetId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = getActiveView(location.pathname);
  const directoryCategoryId = getAssetDirectoryCategoryId(location.pathname);
  const range = getSearchValue(searchParams, "range", defaultFilters.range);
  const timeframe = getSearchValue(searchParams, "timeframe", defaultFilters.timeframe);
  const market = getSearchValue(searchParams, "market", defaultFilters.market);
  const assetType = getSearchValue(searchParams, "assetType", defaultFilters.assetType);
  const level = getSearchValue(searchParams, "level", defaultFilters.level);
  const tag = getSearchValue(searchParams, "tag", defaultFilters.tag);
  const sort = getSearchValue(searchParams, "sort", defaultFilters.sort);
  const order = getSortOrder(getSearchValue(searchParams, "order", defaultFilters.order));
  const signal = getSearchValue(searchParams, "signal", defaultFilters.signal);
  const dataQuality = getChartWallDataQuality(getSearchValue(searchParams, "dataQuality", defaultFilters.dataQuality));
  const valuationStatus = getChartWallValuationStatus(getSearchValue(searchParams, "valuationStatus", defaultFilters.valuationStatus));
  const viewMode = getViewMode(getSearchValue(searchParams, "view", "grid"));
  const search = getSearchValue(searchParams, "q", "");
  const chartWallPage = getPositiveIntegerSearchValue(searchParams, "page", 1);
  const chartWallPageSize = getChartWallPageSize(getPositiveIntegerSearchValue(searchParams, "pageSize", defaultChartWallPageSize));
  const scannerEventType = getSearchValue(searchParams, "eventType", "all");
  const scannerMinSeverity = getSearchValue(searchParams, "severity", "0");
  const scannerMarket = getSearchValue(searchParams, "scannerMarket", "all");
  const scannerQuery = getSearchValue(searchParams, "scannerQ", "");
  const fundDirectory = useFundDirectoryUrlState(searchParams, setSearchParams);
  const compareSelection = useCompareSelection(range, timeframe);
  const [importingFundCode, setImportingFundCode] = useState<string | null>(null);
  const [fundImportMessage, setFundImportMessage] = useState<string | null>(null);
  const [importingDirectoryItemId, setImportingDirectoryItemId] = useState<string | null>(null);
  const [assetDirectoryMessage, setAssetDirectoryMessage] = useState<string | null>(null);
  const isAssetDirectoryView = activeView === "fund-directory" || activeView === "asset-directory";
  const directoryChartFilters = getDirectoryChartFilters(directoryCategoryId);
  const effectiveMarket = activeView === "asset-directory" ? directoryChartFilters.market : market;
  const effectiveAssetType = activeView === "asset-directory" ? directoryChartFilters.assetType : assetType;
  const effectiveSort = activeView === "asset-directory" && !searchParams.has("sort") ? "return_1m" : sort;
  const effectiveOrder = activeView === "asset-directory" && !searchParams.has("order") ? "desc" : order;
  const assetDirectoryMarket = getSearchValue(searchParams, "directoryMarket", "all");
  const assetDirectoryAssetType = getAssetDirectoryAssetType(getSearchValue(searchParams, "directoryAssetType", "all"));
  const assetDirectoryDataState = getAssetDirectoryDataState(getSearchValue(searchParams, "dataState", "all"));
  const assetDirectoryValuationStatus = getAssetDirectoryValuationStatus(getSearchValue(searchParams, "valuationStatus", "all"));
  const assetDirectoryStatus = getAssetDirectoryStatus(getSearchValue(searchParams, "status", "all"));
  const assetDirectoryPage = getPositiveIntegerSearchValue(searchParams, "directoryPage", 1);
  const assetDirectoryTableSizing = getAssetDirectoryTableSizing(directoryCategoryId);
  const needsChartWallData = !isAssetDirectoryView && activeView !== "tasks";

  const setQueryValue = useCallback((name: string, value: string, fallback = ""): void => {
    const next = new URLSearchParams(searchParams);
    if (value === fallback || value.length === 0) {
      next.delete(name);
    } else {
      next.set(name, value);
    }

    if (activeView === "asset-directory" && name !== "directoryPage") {
      next.delete("directoryPage");
    }

    if (activeView === "chart-wall" && name !== "page" && name !== "pageSize") {
      next.delete("page");
    }

    if (activeView === "chart-wall" && name === "pageSize") {
      next.delete("page");
    }

    setSearchParams(next);
  }, [activeView, searchParams, setSearchParams]);

  const setSortQueryValue = useCallback((nextSort: string, nextOrder?: ChartWallSortOrder): void => {
    const resolvedOrder = nextOrder ?? (nextSort === sort ? toggleSortOrder(order) : defaultOrderForSort(nextSort));
    const next = new URLSearchParams(searchParams);

    if (nextSort === defaultFilters.sort) {
      next.delete("sort");
    } else {
      next.set("sort", nextSort);
    }

    if (resolvedOrder === defaultFilters.order) {
      next.delete("order");
    } else {
      next.set("order", resolvedOrder);
    }

    if (activeView === "asset-directory") {
      next.delete("directoryPage");
    }

    if (activeView === "chart-wall") {
      next.delete("page");
    }

    setSearchParams(next);
  }, [activeView, order, searchParams, setSearchParams, sort]);

  const scrollChartWallSectionIntoView = useCallback((): void => {
    window.requestAnimationFrame(() => {
      chartWallSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const setChartWallPage = useCallback((value: number): void => {
    setQueryValue("page", String(value), "1");
    scrollChartWallSectionIntoView();
  }, [scrollChartWallSectionIntoView, setQueryValue]);

  const setChartWallPageSize = useCallback((value: number): void => {
    setQueryValue("pageSize", String(value), String(defaultChartWallPageSize));
    scrollChartWallSectionIntoView();
  }, [scrollChartWallSectionIntoView, setQueryValue]);

  useEffect(() => {
    if ((timeframe === "15m" || timeframe === "1h" || timeframe === "4h") && (range === "1y" || range === "3y" || range === "5y")) {
      setQueryValue("range", "1m", defaultFilters.range);
    }
  }, [range, setQueryValue, timeframe]);

  const shouldHydrateChartWallValuations = shouldIncludeChartWallValuations({
    assetType: effectiveAssetType,
    market: effectiveMarket,
    sort: effectiveSort,
    valuationStatus,
    view: activeView
  });
  const filters = useMemo<ChartWallFilters>(
    () => ({
      range,
      timeframe,
      keyword: search,
      universe: "global",
      level,
      market: effectiveMarket,
      assetType: effectiveAssetType,
      tag,
      sort: effectiveSort,
      order: effectiveOrder,
      signal,
      dataQuality,
      valuationStatus,
      includeValuations: shouldHydrateChartWallValuations,
      limit: activeView === "chart-wall" ? chartWallPageSize : 10000,
      offset: activeView === "chart-wall" ? (chartWallPage - 1) * chartWallPageSize : 0
    }),
    [activeView, chartWallPage, chartWallPageSize, dataQuality, effectiveAssetType, effectiveMarket, effectiveOrder, effectiveSort, level, range, search, shouldHydrateChartWallValuations, signal, tag, timeframe, valuationStatus]
  );
  const { data, error, isLoading, reload } = useChartWallQuery(filters, needsChartWallData);
  const chartWallFacets = useMemo(() => {
    const facets = data?.chartWall.facets;

    if (!facets || shouldHydrateChartWallValuations) {
      return facets;
    }

    return {
      ...facets,
      valuationStatuses: undefined
    };
  }, [data?.chartWall.facets, shouldHydrateChartWallValuations]);
  const fundDirectoryQuery = useFundDirectoryQuery(fundDirectory.filters, activeView === "fund-directory");
  const assetDirectoryFilters = useMemo(
    () => ({
      categoryId: directoryCategoryId ?? "crypto",
      keyword: search,
      market: assetDirectoryMarket,
      assetType: assetDirectoryAssetType,
      dataState: assetDirectoryDataState,
      valuationStatus: assetDirectoryValuationStatus,
      status: assetDirectoryStatus,
      sort: getAssetDirectorySort(effectiveSort),
      order: effectiveOrder,
      limit: assetDirectoryLimit,
      offset: (assetDirectoryPage - 1) * assetDirectoryLimit
    }) as const,
    [assetDirectoryAssetType, assetDirectoryDataState, assetDirectoryMarket, assetDirectoryPage, assetDirectoryStatus, assetDirectoryValuationStatus, directoryCategoryId, effectiveOrder, effectiveSort, search]
  );
  const assetDirectoryQuery = useAssetDirectoryQuery(assetDirectoryFilters, activeView === "asset-directory");
  const taskCenterQuery = useTaskCenterQuery(true);
  const assetDetailQuery = useAssetDetailQuery(routeAssetId, range, timeframe, activeView === "asset-detail");
  const taskActions = useTaskActions({
    reloadChartWall: reload,
    reloadFundDirectory: fundDirectoryQuery.reload,
    reloadTaskCenter: taskCenterQuery.reload,
    onFundMessage: setFundImportMessage
  });
  const isGlobalSyncing = taskActions.runningActionKey === "refresh-global-bars";
  const isFundCatalogSyncing = taskActions.runningActionKey === "sync-fund-catalog";
  const chartItems = useMemo(() => (data?.chartWall.items ?? []).map((item) => ({ ...item, isCompared: compareSelection.comparedSet.has(item.id) })), [compareSelection.comparedSet, data]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (keyword.length === 0) {
      return chartItems;
    }

    return chartItems.filter((item) => {
      const text = `${item.symbol} ${item.name} ${item.market} ${item.exchange} ${item.assetType} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [chartItems, search]);
  const chartWallTotalCount = data?.chartWall.totalCount ?? filteredItems.length;
  const safeChartWallPage = Math.min(chartWallPage, Math.max(Math.ceil(chartWallTotalCount / chartWallPageSize), 1));
  const isChartWallInitialLoading = needsChartWallData && isLoading && !data;
  const chartWallBlockingError = needsChartWallData && error && !data;
  const isChartWallUpdating = needsChartWallData && isLoading && Boolean(data);

  useEffect(() => {
    if (activeView !== "chart-wall" || !data || chartWallPage === safeChartWallPage) {
      return;
    }

    setQueryValue("page", String(safeChartWallPage), "1");
  }, [activeView, chartWallPage, data, safeChartWallPage, setQueryValue]);

  const selectedListItem = useMemo(() => chartItems.find((item) => item.id === routeAssetId) ?? filteredItems[0] ?? chartItems[0] ?? null, [chartItems, filteredItems, routeAssetId]);
  const selectedItem = useMemo(() => {
    if (activeView === "asset-detail") {
      return assetDetailQuery.data?.item ? { ...assetDetailQuery.data.item, isCompared: compareSelection.comparedSet.has(assetDetailQuery.data.item.id) } : null;
    }

    return selectedListItem;
  }, [activeView, assetDetailQuery.data, compareSelection.comparedSet, selectedListItem]);

  const handleRefresh = async (): Promise<void> => {
    await taskActions.startGlobalRefresh();
  };

  const handlePin = (assetId: string): void => {
    const item = chartItems.find((candidate) => candidate.id === assetId) ?? (assetDetailQuery.data?.item.id === assetId ? assetDetailQuery.data.item : null);
    const request = item?.isPinned ? chartWallApiService.removeWatchlistAsset(assetId) : chartWallApiService.addWatchlistAsset(assetId);
    void request.then(() => {
      if (item) {
        assetDetailQuery.setPinned(assetId, !item.isPinned);
      }
      return reload();
    });
  };

  const handleFundCatalogSync = async (): Promise<void> => {
    await taskActions.syncFundCatalog();
  };

  const handleFundImport = async (code: string): Promise<void> => {
    setImportingFundCode(code);
    setFundImportMessage(null);
    try {
      const response = await chartWallApiService.importEastmoneyFund(code);
      setFundImportMessage(`${response.asset.name} 已导入，${response.barsImported.toLocaleString("en-US")} 条净值`);
      await fundDirectoryQuery.reload();
      await reload();
    } catch (nextError) {
      setFundImportMessage(nextError instanceof Error ? nextError.message : "基金导入失败");
    } finally {
      setImportingFundCode(null);
    }
  };

  const handleAssetDirectoryImport = async (item: AssetDirectoryItem): Promise<void> => {
    if (!directoryCategoryId) {
      return;
    }

    setImportingDirectoryItemId(item.id);
    setAssetDirectoryMessage(null);
    try {
      const response = await chartWallApiService.importAssetDirectoryItem(directoryCategoryId, item.id);
      setAssetDirectoryMessage(`${response.asset.name} 已加入走势池，导入 ${response.barsImported.toLocaleString("en-US")} 条日线数据`);
      await assetDirectoryQuery.reload();
      await taskCenterQuery.reload();
    } catch (nextError) {
      setAssetDirectoryMessage(nextError instanceof Error ? nextError.message : "加入走势池失败");
    } finally {
      setImportingDirectoryItemId(null);
    }
  };

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams());
  };

  const applyStrategyPreset = (preset: StrategyPresetFilters): void => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("level");
    next.delete("tag");
    next.delete("dataQuality");
    next.delete("valuationStatus");
    next.delete("page");

    for (const [key, value] of Object.entries(preset)) {
      const fallback = defaultFilters[key as keyof typeof defaultFilters] ?? "";
      if (!value || value === fallback) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    setSearchParams(next);
  };

  const removeFilterChip = (key: string): void => {
    const next = new URLSearchParams(searchParams);
    const queryKey = key === "search" ? "q" : key;

    next.delete(queryKey);
    if (key === "sort") {
      next.delete("order");
    }

    next.delete("page");

    setSearchParams(next);
  };

  const chartContextSearch = getChartContextSearch(searchParams, activeView);
  const universeSearch = getUniverseSearch(searchParams);
  const scannerSearch = getScannerSearch(searchParams);
  const fundDirectorySearch = getFundDirectorySearch(searchParams);
  const cryptoDirectorySearch = getAssetDirectorySearch(searchParams, "crypto", directoryCategoryId);
  const commoditiesDirectorySearch = getAssetDirectorySearch(searchParams, "commodities", directoryCategoryId);
  const usEquityDirectorySearch = getAssetDirectorySearch(searchParams, "us-equity", directoryCategoryId);
  const aShareDirectorySearch = getAssetDirectorySearch(searchParams, "a-share", directoryCategoryId);
  const hkEquityDirectorySearch = getAssetDirectorySearch(searchParams, "hk-equity", directoryCategoryId);
  const macroDirectorySearch = getAssetDirectorySearch(searchParams, "macro", directoryCategoryId);
  const assetDetailReturnPath = getAssetDetailReturnPath(searchParams);
  const assetDetailReturnLabel = getAssetDetailReturnLabel(assetDetailReturnPath);
  const headerDataSourceLabel = getHeaderDataSourceLabel(activeView, data, assetDirectoryQuery.data?.category.coverage);
  const handleAssetDetailBack = (): void => {
    navigate(assetDetailReturnPath);
  };

  const selectAsset = (assetId: string): void => {
    const next = new URLSearchParams(searchParams);
    const sourcePath = activeView === "asset-detail" ? assetDetailReturnPath : getReturnSourcePath(location.pathname, searchParams);
    next.set("from", sourcePath);
    navigate({ pathname: `/assets/${assetId}`, search: `?${next.toString()}` });
  };

  return (
    <AppShell
      sidebar={
        <>
          <div className="brand-block">
            <LineChart size={24} aria-hidden="true" />
            <div>
              <strong>Gold Insights</strong>
              <span>本地资产雷达</span>
            </div>
          </div>
          <nav className="sidebar-nav" aria-label="主导航">
            <SidebarButton active={activeView === "overview"} label="概览" title="全市场概览" to={`/overview${chartContextSearch}`}>
              <Gauge size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "chart-wall"} label="图表墙" title="全市场图表墙" to={`/chart-wall${chartContextSearch}`}>
              <BarChart3 size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarGroup active={isAssetDirectoryView} label="资产目录" title="资产目录" icon={<FolderOpen size={18} aria-hidden="true" />}>
              <SidebarButton active={activeView === "fund-directory"} label="基金目录" title="基金目录" to={`/directories/funds${fundDirectorySearch}`} level="child">
                <BookOpen size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "crypto"} label="加密目录" title="加密目录" to={`/directories/crypto${cryptoDirectorySearch}`} level="child">
                <Bitcoin size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "commodities"} label="商品目录" title="商品目录" to={`/directories/commodities${commoditiesDirectorySearch}`} level="child">
                <BarChart3 size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "us-equity"} label="美股目录" title="美股目录" to={`/directories/us-equity${usEquityDirectorySearch}`} level="child">
                <BarChart3 size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "a-share"} label="A 股目录" title="A 股目录" to={`/directories/a-share${aShareDirectorySearch}`} level="child">
                <BarChart3 size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "hk-equity"} label="港股目录" title="港股目录" to={`/directories/hk-equity${hkEquityDirectorySearch}`} level="child">
                <BarChart3 size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "asset-directory" && directoryCategoryId === "macro"} label="宏观目录" title="宏观目录" to={`/directories/macro${macroDirectorySearch}`} level="child">
                <Gauge size={16} aria-hidden="true" />
              </SidebarButton>
            </SidebarGroup>
            <SidebarButton active={activeView === "universe"} label="资产宇宙" title="资产宇宙" to={`/universe${universeSearch}`}>
              <Network size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "scanner"} label="机会扫描" title="机会扫描" to={`/scanner${scannerSearch}`}>
              <Sparkles size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "watchlist"} label="自选" title="自选图表墙" to={`/watchlist${chartContextSearch}`}>
              <Star size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "tasks"} label="任务中心" title="任务中心" to="/tasks">
              <ListChecks size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "data-health"} label="数据状态" title="数据源与任务状态" to={`/data-health${chartContextSearch}`}>
              <Database size={18} aria-hidden="true" />
            </SidebarButton>
          </nav>
        </>
      }
    >
      <header className={`workspace-header ${activeView === "asset-detail" ? "workspace-header--detail" : ""}`}>
        <div className="workspace-header__title-block">
          {activeView === "asset-detail" && (
            <button type="button" className="workspace-header__back-button" onClick={handleAssetDetailBack} aria-label={`返回${assetDetailReturnLabel}`}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <div>
            <p className="workspace-header__eyebrow">真实数据源: {headerDataSourceLabel}</p>
            <h1>{activeView === "asset-detail" && selectedItem ? selectedItem.name : activeView === "asset-directory" ? assetDirectoryQuery.data?.category.label ?? getAssetDirectoryLabel(directoryCategoryId) : viewTitles[activeView]}</h1>
          </div>
        </div>
        <div className="workspace-header__actions">
          <label className="search-control" htmlFor="asset-search">
            <Search size={17} aria-hidden="true" />
            <input id="asset-search" value={search} onChange={(event) => setQueryValue("q", event.target.value)} placeholder="搜索 AAPL、沪深 300、黄金、BTC、SOXX" />
            {search.length > 0 && (
              <button type="button" onClick={() => setQueryValue("q", "")} aria-label="清空搜索">
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </label>
          <TaskStatusButton
            data={taskCenterQuery.data}
            error={taskCenterQuery.error}
            isLoading={taskCenterQuery.isLoading}
            isPolling={taskCenterQuery.isPolling}
            lastLoadedAt={taskCenterQuery.lastLoadedAt}
            pollIntervalMs={taskCenterQuery.pollIntervalMs}
            onClick={() => {
              navigate("/tasks");
            }}
          />
          <IconButton label="刷新数据" onClick={handleRefresh} disabled={isGlobalSyncing}>
            <RefreshCcw size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      {activeView !== "tasks" && (
        <TaskActivityNotice
          data={taskCenterQuery.data}
          error={taskCenterQuery.error}
          isLoading={taskCenterQuery.isLoading}
          onOpen={() => {
            navigate("/tasks");
          }}
        />
      )}

      {activeView === "asset-detail" ? (
        <section className="control-strip control-strip--detail" aria-label="详情图表控制">
          <RangePicker value={range} onChange={(value) => setQueryValue("range", value, defaultFilters.range)} />
          <TimeframePicker value={timeframe} onChange={(value) => setQueryValue("timeframe", value, defaultFilters.timeframe)} />
          <Button variant="ghost" onClick={handleRefresh} disabled={isGlobalSyncing}>
            {isGlobalSyncing ? "刷新中" : "重新采集"}
          </Button>
        </section>
      ) : isAssetDirectoryView || activeView === "tasks" ? null : (
        <>
          <ChartWallControls
            values={{ market, assetType, level, tag, signal, dataQuality, valuationStatus, sort, order, range, timeframe, viewMode }}
            defaults={defaultFilters}
            facets={chartWallFacets}
            options={{ markets: marketFallbackOptions, assetTypes: assetTypeFallbackOptions, levels: levelFallbackOptions, tags: tagFallbackOptions, signals: signalFallbackOptions, dataQualities: dataQualityFallbackOptions, valuationStatuses: valuationStatusFallbackOptions, sorts: sortOptions, orders: sortOrderOptions }}
            summary={{ visibleCount: chartWallTotalCount, apiCount: filteredItems.length, sortLabel: sortDisplayLabel(sort), orderLabel: sortOrderLabel(order) }}
            isRefreshing={isGlobalSyncing}
            showViewMode={activeView === "chart-wall"}
            activeFilterSlot={(
              <ActiveFilterChips
                filters={{ market, assetType, level, tag, signal, dataQuality, valuationStatus, sort, order, search }}
                defaults={{ sort: defaultFilters.sort, order: defaultFilters.order }}
                options={{ assetTypes: assetTypeFallbackOptions, levels: levelFallbackOptions, tags: tagFallbackOptions, signals: signalFallbackOptions, dataQualities: dataQualityFallbackOptions, valuationStatuses: valuationStatusFallbackOptions, sorts: sortOptions, orders: sortOrderOptions }}
                onRemove={removeFilterChip}
                onReset={resetFilters}
              />
            )}
            onQueryChange={setQueryValue}
            onSortChange={setSortQueryValue}
            onDefaultOrder={defaultOrderForSort}
            onParseOrder={getSortOrder}
            onReset={resetFilters}
            onRefresh={() => {
              void handleRefresh();
            }}
          />

          {(activeView === "overview" || activeView === "chart-wall") && (
            <StrategyPresetStrip currentFilters={{ market, assetType, tag, signal, dataQuality, valuationStatus, sort, order, range, timeframe }} onApply={applyStrategyPreset} />
          )}
        </>
      )}
      {data && activeView === "chart-wall" && assetType === "fund" && <FundScopeStrip data={data} market={market} />}

      {isChartWallInitialLoading && <LoadingState />}
      {chartWallBlockingError && <ErrorState title="行情加载失败" message={error} />}
      {needsChartWallData && data && error && <QueryStatus tone="error" title="行情更新失败" message={error} />}

      {(!needsChartWallData || data) && (
        <>
          {activeView === "overview" && data && (
            <OverviewSection
              data={data}
              items={filteredItems}
              market={market}
              sort={sort}
              order={order}
              onMarketSelect={(value) => setQueryValue("market", value, defaultFilters.market)}
              onSelectAsset={selectAsset}
              onCompare={compareSelection.toggleCompare}
            />
          )}

          {activeView === "chart-wall" && data && (
            <section ref={chartWallSectionRef} className="chart-wall-section">
              <SectionHeader
                title="走势列表"
                description={`${rangeLabel(data.chartWall.range)} / ${timeframeLabel(data.chartWall.timeframe)} / ${sortDisplayLabel(sort)} ${sortOrderLabel(order)} / 本页 ${filteredItems.length.toLocaleString("en-US")} / 总数 ${chartWallTotalCount.toLocaleString("en-US")}${isChartWallUpdating ? " / 更新中" : ""}`}
                generatedAt={data.chartWall.generatedAt}
              />
              <ComparePanel compareData={compareSelection.compareData} compareAssetIds={compareSelection.compareAssetIds} allItems={chartItems} onRemove={compareSelection.toggleCompare} onClear={compareSelection.clearCompare} />
              {shouldShowChartWallValuationSummary(sort, valuationStatus) && (
                <ValuationCoverageSummary
                  items={filteredItems}
                  title="市值/规模覆盖"
                  description="按当前图表墙筛选口径统计；美股股票使用 NASDAQ 市值快照，重点 ETF/基金代理标的使用 quote summary/AUM 补充，指数/商品/宏观不适用，空态不是后台加载中。"
                  variant="compact"
                />
              )}
              <ChartWallPagination
                id="chart-wall-page-size-top"
                page={safeChartWallPage}
                pageSize={chartWallPageSize}
                totalCount={chartWallTotalCount}
                currentCount={filteredItems.length}
                pageSizeOptions={chartWallPageSizeOptions}
                onPageChange={setChartWallPage}
                onPageSizeChange={setChartWallPageSize}
              />
              {viewMode === "grid" ? (
                <ChartGrid items={filteredItems} sort={sort} order={order} rankOffset={data.chartWall.offset} onSelect={selectAsset} onPin={handlePin} onCompare={compareSelection.toggleCompare} onResetFilters={resetFilters} />
              ) : (
                <ExchangeTable items={filteredItems} sort={sort} order={order} rankOffset={data.chartWall.offset} onSort={setSortQueryValue} onSelect={selectAsset} onPin={handlePin} onCompare={compareSelection.toggleCompare} />
              )}
              <ChartWallPagination
                id="chart-wall-page-size-bottom"
                page={safeChartWallPage}
                pageSize={chartWallPageSize}
                totalCount={chartWallTotalCount}
                currentCount={filteredItems.length}
                pageSizeOptions={chartWallPageSizeOptions}
                onPageChange={setChartWallPage}
                onPageSizeChange={setChartWallPageSize}
              />
            </section>
          )}

          {activeView === "fund-directory" && (
            <FundDirectorySection
              data={fundDirectoryQuery.data}
              error={fundDirectoryQuery.error}
              isLoading={fundDirectoryQuery.isLoading}
              keyword={fundDirectory.keyword}
              fundType={fundDirectory.fundType}
              status={fundDirectory.status}
              dataState={fundDirectory.dataState}
              sort={fundDirectory.sort}
              order={fundDirectory.order}
              page={fundDirectory.page}
              limit={fundDirectory.limit}
              message={fundImportMessage}
              importingCode={importingFundCode}
              isCatalogSyncing={isFundCatalogSyncing}
              onKeywordChange={(value) => fundDirectory.setQueryValue("fundKeyword", value, "")}
              onFundTypeChange={(value) => fundDirectory.setQueryValue("fundType", value, "all")}
              onDataStateChange={(value) => fundDirectory.setQueryValue("fundDataState", value, "all")}
              onStatusChange={(value) => fundDirectory.setQueryValue("fundStatus", value, "all")}
              onSortChange={fundDirectory.setSortValue}
              onPageChange={(value) => fundDirectory.setQueryValue("fundPage", String(value), "1")}
              onImport={(code) => {
                void handleFundImport(code);
              }}
              onSyncCatalog={() => {
                void handleFundCatalogSync();
              }}
              onSelectAsset={selectAsset}
            />
          )}

          {activeView === "asset-directory" && (
            <AssetDirectoryView
              data={assetDirectoryQuery.data}
              error={assetDirectoryQuery.error}
              isLoading={assetDirectoryQuery.isLoading}
              fallbackTitle={getAssetDirectoryLabel(directoryCategoryId)}
              fallbackDescription="当前展示真实已入库、可打开完整走势和指标的资产。"
              market={assetDirectoryMarket}
              assetType={assetDirectoryAssetType}
              dataState={assetDirectoryDataState}
              valuationStatus={assetDirectoryValuationStatus}
              status={assetDirectoryStatus}
              sort={getAssetDirectorySort(effectiveSort)}
              order={effectiveOrder}
              search={search}
              statusLabel={assetDirectoryQuery.data ? coverageLabel(assetDirectoryQuery.data.category.coverage) : "真实已入库 / 走势池"}
              page={assetDirectoryPage}
              limit={assetDirectoryLimit}
              tableMinWidth={assetDirectoryTableSizing.tableMinWidth}
              firstColumnMinWidth={assetDirectoryTableSizing.firstColumnMinWidth}
              lastColumnMinWidth={assetDirectoryTableSizing.lastColumnMinWidth}
              importingItemId={importingDirectoryItemId}
              message={assetDirectoryMessage}
              onMarketChange={(value) => setQueryValue("directoryMarket", value, "all")}
              onAssetTypeChange={(value) => setQueryValue("directoryAssetType", value, "all")}
              onDataStateChange={(value) => setQueryValue("dataState", value, "all")}
              onValuationStatusChange={(value) => setQueryValue("valuationStatus", value, "all")}
              onStatusChange={(value) => setQueryValue("status", value, "all")}
              onSortChange={setSortQueryValue}
              onSearchChange={(value) => setQueryValue("q", value, "")}
              onReset={resetFilters}
              onPageChange={(value) => setQueryValue("directoryPage", String(value), "1")}
              onImport={(item) => {
                void handleAssetDirectoryImport(item);
              }}
              onSelect={selectAsset}
              onCompare={compareSelection.toggleCompare}
            />
          )}

          {activeView === "universe" && data && (
            <UniverseSection
              nodes={data.universeTree.nodes}
              filters={{ search, market, assetType, level }}
              onSelectAsset={selectAsset}
            />
          )}

          {activeView === "scanner" && data && (
            <ScannerSection
              scannerEvents={data.scannerEvents}
              eventType={scannerEventType}
              minSeverity={scannerMinSeverity}
              market={scannerMarket}
              query={scannerQuery}
              onEventTypeChange={(value) => setQueryValue("eventType", value, "all")}
              onMinSeverityChange={(value) => setQueryValue("severity", value, "0")}
              onMarketChange={(value) => setQueryValue("scannerMarket", value, "all")}
              onQueryChange={(value) => setQueryValue("scannerQ", value, "")}
              onSelectAsset={selectAsset}
            />
          )}

          {activeView === "asset-detail" && (
            assetDetailQuery.isLoading ? (
              <LoadingState />
            ) : assetDetailQuery.error ? (
              <ErrorState title="资产详情加载失败" message={assetDetailQuery.error} />
            ) : (
              <AssetDetailSection
                item={selectedItem}
                relatedItems={filteredItems.filter((item) => item.id !== selectedItem?.id && item.market === selectedItem?.market).slice(0, 8)}
                onSelect={selectAsset}
                onPin={handlePin}
                onCompare={compareSelection.toggleCompare}
              />
            )
          )}

          {activeView === "watchlist" && data && (
            <WatchlistSection
              watchlists={data.watchlists.watchlists}
              chartItems={chartItems}
              onSelect={selectAsset}
              onCompare={compareSelection.toggleCompare}
              onRemove={(assetId) => {
                void chartWallApiService.removeWatchlistAsset(assetId).then(() => reload());
              }}
              onShowAll={resetFilters}
            />
          )}

          {activeView === "tasks" && (
            <TaskCenterSection
              data={taskCenterQuery.data}
              error={taskCenterQuery.error}
              isLoading={taskCenterQuery.isLoading}
              isPolling={taskCenterQuery.isPolling}
              lastLoadedAt={taskCenterQuery.lastLoadedAt}
              pollIntervalMs={taskCenterQuery.pollIntervalMs}
              isStartingSync={isGlobalSyncing}
              runningActionKey={taskActions.runningActionKey}
              actionMessage={taskActions.message}
              onRunAction={(actionKey) => {
                void taskActions.runAction(actionKey);
              }}
              onRefresh={() => {
                void taskCenterQuery.reload();
              }}
            />
          )}

          {activeView === "data-health" && data && (
            <DataHealthSection
              data={data}
              items={filteredItems}
              assetTable={
                <ExchangeTable
                  items={filteredItems}
                  sort={data.chartWall.sort}
                  order={data.chartWall.order}
                  onSort={setSortQueryValue}
                  onSelect={selectAsset}
                  onPin={handlePin}
                  onCompare={compareSelection.toggleCompare}
                />
              }
            />
          )}
        </>
      )}
    </AppShell>
  );
}

type SidebarButtonProps = {
  active: boolean;
  title: string;
  label: string;
  children: JSX.Element;
  to: string;
  level?: "root" | "child";
};

function SidebarButton({ active, title, label, children, to, level = "root" }: SidebarButtonProps): JSX.Element {
  const className = [
    "sidebar-nav__item",
    level === "child" ? "sidebar-nav__item--child" : "",
    active ? "sidebar-nav__item--active" : ""
  ].filter(Boolean).join(" ");

  return (
    <NavLink className={className} title={title} aria-current={active ? "page" : undefined} to={to}>
      {children}
      <span>{label}</span>
    </NavLink>
  );
}

type SidebarGroupProps = {
  active: boolean;
  title: string;
  label: string;
  icon: JSX.Element;
  children: JSX.Element | JSX.Element[];
};

function SidebarGroup({ active, title, label, icon, children }: SidebarGroupProps): JSX.Element {
  return (
    <div className={`sidebar-nav__group ${active ? "sidebar-nav__group--active" : ""}`}>
      <div className="sidebar-nav__group-header" title={title}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="sidebar-nav__group-children">
        {children}
      </div>
    </div>
  );
}

function FundScopeStrip({ data, market }: { data: ChartWallPageData; market: string }): JSX.Element | null {
  const fundScope = data.chartWall.fundScope;

  if (!fundScope) {
    return null;
  }

  return (
    <section className="data-scope-strip" aria-label="基金数据口径">
      <span>基金口径</span>
      <strong>{market === "基金" || fundScope.isMutualFundMarket ? "场外基金" : "当前筛选"} {fundScope.currentCount.toLocaleString("en-US")}</strong>
      <span>全部基金/ETF {fundScope.allFundCount.toLocaleString("en-US")}</span>
      <span>Eastmoney 场外 {fundScope.eastmoneyFundCount.toLocaleString("en-US")}</span>
      {fundScope.seedAndImportedOnly && <span>当前展示已入库种子与已导入基金</span>}
    </section>
  );
}

function getHeaderDataSourceLabel(activeView: ActiveView, data: ChartWallPageData | null, assetDirectoryCoverage?: AssetDirectoryCoverage): string {
  if (activeView === "fund-directory") {
    return "Eastmoney 基金目录 / 本地走势池";
  }

  if (activeView === "asset-directory") {
    return assetDirectoryCoverage === "full" ? "资产目录 API / 本地走势池" : "本地走势池";
  }

  if (activeView === "tasks") {
    return "本地任务中心";
  }

  return data?.chartWall.sources.join(" / ") || "加载中";
}

function SectionHeader({ title, description, generatedAt }: { title: string; description: string; generatedAt?: string }): JSX.Element {
  return (
    <div className="section-title-row">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {generatedAt && (
        <span className="live-status">
          <Activity size={14} aria-hidden="true" />
          {formatDateTime(generatedAt)}
        </span>
      )}
    </div>
  );
}

function getActiveView(pathname: string): ActiveView {
  if (pathname.startsWith("/overview")) {
    return "overview";
  }
  if (pathname.startsWith("/directories/funds") || pathname.startsWith("/funds")) {
    return "fund-directory";
  }
  if (pathname.startsWith("/directories/")) {
    return "asset-directory";
  }
  if (pathname.startsWith("/universe")) {
    return "universe";
  }
  if (pathname.startsWith("/scanner")) {
    return "scanner";
  }
  if (pathname.startsWith("/watchlist")) {
    return "watchlist";
  }
  if (pathname.startsWith("/tasks")) {
    return "tasks";
  }
  if (pathname.startsWith("/data-health")) {
    return "data-health";
  }
  if (pathname.startsWith("/assets/")) {
    return "asset-detail";
  }
  return "chart-wall";
}

function getAssetDetailReturnPath(searchParams: URLSearchParams): string {
  const from = searchParams.get("from");

  if (from && isSafeWorkspacePath(from)) {
    return from;
  }

  return `/overview${getSearchWithout(searchParams, ["from"])}`;
}

function getAssetDetailReturnLabel(path: string): string {
  if (path.startsWith("/overview")) {
    return "概览";
  }

  if (path.startsWith("/funds")) {
    return "基金目录";
  }

  if (path.startsWith("/directories/funds")) {
    return "基金目录";
  }

  if (path.startsWith("/directories/crypto")) {
    return "加密目录";
  }

  if (path.startsWith("/directories/")) {
    return getAssetDirectoryLabel(getAssetDirectoryCategoryId(path));
  }

  if (path.startsWith("/universe")) {
    return "资产宇宙";
  }

  if (path.startsWith("/scanner")) {
    return "机会扫描";
  }

  if (path.startsWith("/watchlist")) {
    return "自选";
  }

  if (path.startsWith("/tasks")) {
    return "任务中心";
  }

  if (path.startsWith("/data-health")) {
    return "数据状态";
  }

  return "图表墙";
}

function getReturnSourcePath(pathname: string, searchParams: URLSearchParams): string {
  const search = getSearchWithout(searchParams, ["from"]);
  return `${pathname}${search}`;
}

function getChartContextSearch(searchParams: URLSearchParams, activeView: ActiveView): string {
  const names = activeView === "asset-directory" || activeView === "fund-directory"
    ? ["range", "timeframe", "q"]
    : ["range", "timeframe", "market", "assetType", "level", "tag", "sort", "order", "signal", "dataQuality", "valuationStatus", "view", "q", "page", "pageSize"];

  return getSearchWithOnly(searchParams, names);
}

function getUniverseSearch(searchParams: URLSearchParams): string {
  return getSearchWithOnly(searchParams, ["q", "market", "assetType", "level"]);
}

function getScannerSearch(searchParams: URLSearchParams): string {
  return getSearchWithOnly(searchParams, ["eventType", "severity", "scannerMarket", "scannerQ"]);
}

function getSearchWithOnly(searchParams: URLSearchParams, names: string[]): string {
  const next = new URLSearchParams();

  for (const name of names) {
    const value = searchParams.get(name);
    if (value) {
      next.set(name, value);
    }
  }

  return toSearchString(next);
}

function getSearchWithout(searchParams: URLSearchParams, excludedNames: string[]): string {
  const next = new URLSearchParams(searchParams);

  for (const name of excludedNames) {
    next.delete(name);
  }

  const value = next.toString();
  return value.length > 0 ? `?${value}` : "";
}

function isSafeWorkspacePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/assets/")) {
    return false;
  }

  return ["/overview", "/chart-wall", "/directories", "/funds", "/universe", "/scanner", "/watchlist", "/tasks", "/data-health"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

function getFundDirectorySearch(searchParams: URLSearchParams): string {
  const next = new URLSearchParams();

  for (const name of ["fundKeyword", "fundType", "fundDataState", "fundStatus", "fundSort", "fundOrder", "fundPage"]) {
    const value = searchParams.get(name);
    if (value) {
      next.set(name, value);
    }
  }

  return toSearchString(next);
}

function getAssetDirectorySearch(searchParams: URLSearchParams, targetCategoryId: AssetDirectoryCategoryId, currentCategoryId: AssetDirectoryCategoryId | null): string {
  const next = new URLSearchParams();
  const shouldPreservePage = targetCategoryId === currentCategoryId;

  for (const name of ["range", "timeframe", "q", "directoryMarket", "directoryAssetType", "dataState", "valuationStatus", "status", "sort", "order", "directoryPage"]) {
    if (name === "directoryPage" && !shouldPreservePage) {
      continue;
    }

    const value = searchParams.get(name);
    if (value) {
      next.set(name, value);
    }
  }

  if (!next.has("sort")) {
    next.set("sort", "return_1m");
  }

  if (!next.has("order")) {
    next.set("order", "desc");
  }

  return toSearchString(next);
}

function getAssetDirectoryCategoryId(pathname: string): AssetDirectoryCategoryId | null {
  const match = /^\/directories\/([^/?]+)/.exec(pathname);
  const value = match?.[1];
  const supported: AssetDirectoryCategoryId[] = ["funds", "crypto", "commodities", "us-equity", "a-share", "hk-equity", "macro"];
  return value && supported.includes(value as AssetDirectoryCategoryId) ? (value as AssetDirectoryCategoryId) : null;
}

function getAssetDirectoryLabel(categoryId: AssetDirectoryCategoryId | null): string {
  const labels: Record<AssetDirectoryCategoryId, string> = {
    funds: "基金目录",
    crypto: "加密目录",
    commodities: "商品目录",
    "us-equity": "美股目录",
    "a-share": "A 股目录",
    "hk-equity": "港股目录",
    macro: "宏观目录"
  };
  return categoryId ? labels[categoryId] : "资产目录";
}

function getDirectoryChartFilters(categoryId: AssetDirectoryCategoryId | null): { market: string; assetType: string } {
  const filters: Partial<Record<AssetDirectoryCategoryId, { market: string; assetType: string }>> = {
    crypto: { market: "加密", assetType: "crypto" },
    commodities: { market: "商品", assetType: "all" },
    "us-equity": { market: "美股", assetType: "all" },
    "a-share": { market: "A 股", assetType: "all" },
    "hk-equity": { market: "港股", assetType: "all" },
    macro: { market: "all", assetType: "macro" }
  };
  return filters[categoryId ?? "crypto"] ?? { market: "all", assetType: "all" };
}

function toSearchString(searchParams: URLSearchParams): string {
  const value = searchParams.toString();
  return value.length > 0 ? `?${value}` : "";
}

function getSearchValue(searchParams: URLSearchParams, name: string, fallback: string): string {
  return searchParams.get(name) ?? fallback;
}

function getPositiveIntegerSearchValue(searchParams: URLSearchParams, name: string, fallback: number): number {
  const value = Number(searchParams.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getChartWallPageSize(value: number): number {
  const supported = chartWallPageSizeOptions.map((option) => Number(option.value));
  return supported.includes(value) ? value : defaultChartWallPageSize;
}

function getViewMode(value: string): ChartWallViewMode {
  return value === "table" ? "table" : "grid";
}

function getSortOrder(value: string): ChartWallSortOrder {
  return value === "asc" ? "asc" : "desc";
}

function getChartWallDataQuality(value: string): ChartWallDataQualityFilter {
  const supported: ChartWallDataQualityFilter[] = ["all", "fresh", "thin", "lagged", "missing", "unknown"];
  return supported.includes(value as ChartWallDataQualityFilter) ? (value as ChartWallDataQualityFilter) : "all";
}

function getChartWallValuationStatus(value: string): ChartWallValuationStatusFilter {
  const supported: ChartWallValuationStatusFilter[] = ["all", "available", "turnover_only", "source_missing_value", "source_unavailable", "not_applicable"];
  return supported.includes(value as ChartWallValuationStatusFilter) ? (value as ChartWallValuationStatusFilter) : "all";
}

function toggleSortOrder(value: ChartWallSortOrder): ChartWallSortOrder {
  return value === "desc" ? "asc" : "desc";
}

function defaultOrderForSort(sort: string): ChartWallSortOrder {
  return sort === "symbol" || sort === "market" || sort === "asset_type" ? "asc" : "desc";
}

function shouldShowChartWallValuationSummary(sort: string, valuationStatus: ChartWallValuationStatusFilter): boolean {
  return sort === "market_cap" || valuationStatus !== "all";
}

function getAssetDirectorySort(sort: string): AssetDirectorySortKey {
  const supported: AssetDirectorySortKey[] = ["relevance", "label", "latest_value", "market_cap", "return_1d", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];
  return supported.includes(sort as AssetDirectorySortKey) ? (sort as AssetDirectorySortKey) : "relevance";
}

function getAssetDirectoryStatus(status: string): AssetDirectoryStatusFilter {
  return status === "in_pool" || status === "not_in_pool" ? status : "all";
}

function getAssetDirectoryAssetType(assetType: string): AssetDirectoryAssetTypeFilter {
  const supported: AssetDirectoryAssetTypeFilter[] = ["all", "crypto", "equity", "index", "fund", "commodity", "macro"];
  return supported.includes(assetType as AssetDirectoryAssetTypeFilter) ? (assetType as AssetDirectoryAssetTypeFilter) : "all";
}

function getAssetDirectoryDataState(dataState: string): AssetDirectoryDataStateFilter {
  const supported: AssetDirectoryDataStateFilter[] = ["all", "full_history", "snapshot", "missing", "stale"];
  return supported.includes(dataState as AssetDirectoryDataStateFilter) ? (dataState as AssetDirectoryDataStateFilter) : "all";
}

function getAssetDirectoryValuationStatus(valuationStatus: string): AssetDirectoryValuationStatusFilter {
  const supported: AssetDirectoryValuationStatusFilter[] = ["all", "available", "turnover_only", "source_missing_value", "source_unavailable", "not_applicable"];
  return supported.includes(valuationStatus as AssetDirectoryValuationStatusFilter) ? (valuationStatus as AssetDirectoryValuationStatusFilter) : "all";
}

function coverageLabel(coverage: AssetDirectoryCoverage): string {
  const labels: Record<AssetDirectoryCoverage, string> = {
    full: "全量目录 / 可加入走势池",
    partial: "部分目录 / 可扩展",
    trend_pool_only: "真实已入库 / 走势池"
  };
  return labels[coverage];
}

function sortDisplayLabel(sort: string): string {
  return optionLabel(sortOptions, sort);
}

function sortOrderLabel(order: ChartWallSortOrder): string {
  return optionLabel(sortOrderOptions, order);
}

function optionLabel(options: ControlOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function rangeLabel(value: string): string {
  const labels: Record<string, string> = {
    "1m": "1个月",
    "3m": "3个月",
    "6m": "6个月",
    "1y": "1年",
    "3y": "3年",
    "5y": "5年"
  };
  return labels[value] ?? value;
}

function timeframeLabel(value: string): string {
  const labels: Record<string, string> = {
    "15m": "15m",
    "1h": "1H",
    "4h": "4H",
    "1d": "日线",
    "1w": "周线",
    "1mo": "月线"
  };
  return labels[value] ?? value;
}
