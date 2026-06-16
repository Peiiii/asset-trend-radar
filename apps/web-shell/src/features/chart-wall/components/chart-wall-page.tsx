import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Database,
  Grid3X3,
  LineChart,
  ListChecks,
  Network,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  Table2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, Button, EmptyState, ErrorState, FilterChip, IconButton, LoadingState, RangePicker, Select, TimeframePicker } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ChartWallFacet, ChartWallItem, ChartWallSortOrder, ScannerEventsResponse } from "@gold-insights/market-domain";
import type { AssetDetailData, ChartWallFilters, ChartWallPageData, CompareData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { AssetChartCard } from "./asset-chart-card";
import { AssetDetailSection } from "./asset-detail-section/asset-detail-section";
import { ComparePanel } from "./compare-panel/compare-panel";
import { BreadthStrip, SummaryStrip } from "./dashboard-strips";
import { DataHealthSection } from "./data-health-section/data-health-section";
import { ExchangeTable } from "./exchange-table/exchange-table";
import { FundDirectorySection } from "./fund-directory-section";
import { MarketPulseBoard } from "./market-pulse-board/market-pulse-board";
import "./market-chart-primitives.css";
import { OpportunityLeaderboard } from "./opportunity-leaderboard/opportunity-leaderboard";
import { ScannerSection } from "./scanner-section/scanner-section";
import { TaskCenterSection } from "./task-center/task-center-section";
import { TaskStatusButton } from "./task-center/task-status-button";
import { UniverseSection } from "./universe-section/universe-section";
import { WatchlistSection } from "./watchlist-section/watchlist-section";
import { chartWallApiService } from "../services/chart-wall-api.service";
import { useFundDirectoryQuery } from "../hooks/use-fund-directory-query";
import { useChartWallQuery } from "../hooks/use-chart-wall-query";
import { useFundDirectoryUrlState } from "../hooks/use-fund-directory-url-state";
import { useTaskCenterQuery } from "../hooks/use-task-center-query";

type ActiveView = "chart-wall" | "fund-directory" | "universe" | "scanner" | "asset-detail" | "watchlist" | "tasks" | "data-health";
type ViewMode = "grid" | "table";

const viewTitles: Record<ActiveView, string> = {
  "chart-wall": "全市场图表墙",
  "fund-directory": "基金目录",
  universe: "资产宇宙",
  scanner: "机会扫描",
  "asset-detail": "资产详情",
  watchlist: "自选图表墙",
  tasks: "任务中心",
  "data-health": "数据源与任务状态"
};

const defaultFilters = {
  range: "6m",
  timeframe: "1d",
  market: "all",
  assetType: "all",
  level: "all",
  sort: "trend_score",
  order: "desc" as ChartWallSortOrder,
  signal: "all"
};

const marketFallbackOptions: ControlOption[] = [
  { value: "A 股", label: "A 股", description: "指数、ETF、重点公司" },
  { value: "基金", label: "基金", description: "Eastmoney 场外基金" },
  { value: "美股", label: "美股", description: "指数、ETF、重点公司" },
  { value: "港股", label: "港股", description: "指数、ETF、重点公司" },
  { value: "商品", label: "商品", description: "期货与商品 ETF" },
  { value: "外汇", label: "外汇", description: "汇率代理指标" },
  { value: "债券", label: "债券", description: "利率与债券 ETF" },
  { value: "宏观", label: "宏观", description: "宏观代理指标" },
  { value: "加密", label: "加密", description: "数字资产" }
];
const assetTypeFallbackOptions: ControlOption[] = [
  { value: "index", label: "指数", description: "宽基、行业与主题指数" },
  { value: "fund", label: "基金/ETF", description: "场外基金、ETF、商品基金" },
  { value: "equity", label: "公司", description: "重点公司走势" },
  { value: "commodity", label: "商品", description: "贵金属、能源、工业品" },
  { value: "macro", label: "宏观/外汇/债券", description: "宏观与利率代理指标" },
  { value: "crypto", label: "加密", description: "主流数字资产" }
];
const levelFallbackOptions: ControlOption[] = [
  { value: "broad-index", label: "宽基" },
  { value: "sector-index", label: "行业" },
  { value: "theme-basket", label: "主题" },
  { value: "company", label: "公司" },
  { value: "instrument", label: "工具/合约" },
  { value: "macro-indicator", label: "宏观" }
];
const sortOptions: ControlOption[] = [
  { value: "trend_score", label: "趋势分", description: "趋势强度优先" },
  { value: "return", label: "区间涨幅", description: "跟随当前图表时间跨度" },
  { value: "return_1d", label: "1D 涨幅" },
  { value: "return_1w", label: "1W 涨幅" },
  { value: "return_1m", label: "1M 涨幅" },
  { value: "return_3m", label: "3M 涨幅" },
  { value: "return_6m", label: "6M 涨幅" },
  { value: "return_1y", label: "1Y 涨幅" },
  { value: "volume_ratio", label: "量能放大", description: "最近成交相对 20 日均值" },
  { value: "drawdown", label: "回撤较小", description: "距离区间高点更近" },
  { value: "event_count", label: "事件数", description: "扫描事件多的靠前" },
  { value: "macd", label: "事件/MACD", description: "事件与 MACD 状态优先" },
  { value: "market", label: "市场" },
  { value: "asset_type", label: "品种" },
  { value: "symbol", label: "代码" }
];
const sortOrderOptions: ControlOption[] = [
  { value: "desc", label: "降序", description: "数值高的靠前" },
  { value: "asc", label: "升序", description: "数值低的靠前" }
];
const signalFallbackOptions: ControlOption[] = [
  { value: "strong", label: "强趋势" },
  { value: "weak", label: "偏弱" },
  { value: "positive", label: "区间上涨" },
  { value: "negative", label: "区间下跌" },
  { value: "macd_golden_cross", label: "MACD 金叉" },
  { value: "macd_dead_cross", label: "MACD 死叉" },
  { value: "breakout", label: "价格突破" },
  { value: "volume_breakout", label: "量能放大" },
  { value: "eventful", label: "有扫描事件" },
  { value: "pinned", label: "已自选" }
];
export function ChartWallPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { assetId: routeAssetId } = useParams<{ assetId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = getActiveView(location.pathname);
  const range = getSearchValue(searchParams, "range", defaultFilters.range);
  const timeframe = getSearchValue(searchParams, "timeframe", defaultFilters.timeframe);
  const market = getSearchValue(searchParams, "market", defaultFilters.market);
  const assetType = getSearchValue(searchParams, "assetType", defaultFilters.assetType);
  const level = getSearchValue(searchParams, "level", defaultFilters.level);
  const sort = getSearchValue(searchParams, "sort", defaultFilters.sort);
  const order = getSortOrder(getSearchValue(searchParams, "order", defaultFilters.order));
  const signal = getSearchValue(searchParams, "signal", defaultFilters.signal);
  const viewMode = getViewMode(getSearchValue(searchParams, "view", "grid"));
  const search = getSearchValue(searchParams, "q", "");
  const scannerEventType = getSearchValue(searchParams, "eventType", "all");
  const scannerMinSeverity = getSearchValue(searchParams, "severity", "0");
  const scannerMarket = getSearchValue(searchParams, "scannerMarket", "all");
  const scannerQuery = getSearchValue(searchParams, "scannerQ", "");
  const fundDirectory = useFundDirectoryUrlState(searchParams, setSearchParams);
  const [compareAssetIds, setCompareAssetIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [isFundCatalogSyncing, setIsFundCatalogSyncing] = useState(false);
  const [importingFundCode, setImportingFundCode] = useState<string | null>(null);
  const [fundImportMessage, setFundImportMessage] = useState<string | null>(null);
  const [assetDetailData, setAssetDetailData] = useState<AssetDetailData | null>(null);
  const [assetDetailError, setAssetDetailError] = useState<string | null>(null);
  const [isAssetDetailLoading, setIsAssetDetailLoading] = useState(false);

  const setQueryValue = useCallback((name: string, value: string, fallback = ""): void => {
    const next = new URLSearchParams(searchParams);
    if (value === fallback || value.length === 0) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

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

    setSearchParams(next);
  }, [order, searchParams, setSearchParams, sort]);

  useEffect(() => {
    if ((timeframe === "15m" || timeframe === "1h" || timeframe === "4h") && (range === "1y" || range === "3y" || range === "5y")) {
      setQueryValue("range", "1m", defaultFilters.range);
    }
  }, [range, setQueryValue, timeframe]);

  const filters = useMemo<ChartWallFilters>(
    () => ({
      range,
      timeframe,
      universe: "global",
      level,
      market,
      assetType,
      sort,
      order,
      signal
    }),
    [assetType, level, market, order, range, signal, sort, timeframe]
  );
  const { data, error, isLoading, isRefreshing, refresh, reload } = useChartWallQuery(filters);
  const fundDirectoryQuery = useFundDirectoryQuery(fundDirectory.filters, activeView === "fund-directory");
  const taskCenterQuery = useTaskCenterQuery(true);
  const comparedSet = useMemo(() => new Set(compareAssetIds), [compareAssetIds]);
  const chartItems = useMemo(() => (data?.chartWall.items ?? []).map((item) => ({ ...item, isCompared: comparedSet.has(item.id) })), [comparedSet, data]);

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

  const selectedListItem = useMemo(() => chartItems.find((item) => item.id === routeAssetId) ?? filteredItems[0] ?? chartItems[0] ?? null, [chartItems, filteredItems, routeAssetId]);
  const selectedItem = useMemo(() => {
    if (activeView === "asset-detail") {
      return assetDetailData?.item ? { ...assetDetailData.item, isCompared: comparedSet.has(assetDetailData.item.id) } : null;
    }

    return selectedListItem;
  }, [activeView, assetDetailData, comparedSet, selectedListItem]);

  useEffect(() => {
    if (compareAssetIds.length < 2) {
      setCompareData(null);
      return;
    }

    void chartWallApiService.fetchCompare(compareAssetIds, range, timeframe).then(setCompareData).catch(() => setCompareData(null));
  }, [compareAssetIds, range, timeframe]);

  useEffect(() => {
    if (activeView !== "asset-detail" || !routeAssetId) {
      setAssetDetailData(null);
      setAssetDetailError(null);
      setIsAssetDetailLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setIsAssetDetailLoading(true);
    setAssetDetailError(null);

    void chartWallApiService
      .fetchAssetDetail(routeAssetId, range, timeframe, controller.signal)
      .then(setAssetDetailData)
      .catch((nextError: unknown) => {
        if (!controller.signal.aborted) {
          setAssetDetailError(nextError instanceof Error ? nextError.message : "资产详情加载失败");
          setAssetDetailData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAssetDetailLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeView, range, routeAssetId, timeframe]);

  const handleRefresh = (): void => {
    void refresh();
  };

  const handlePin = (assetId: string): void => {
    const item = chartItems.find((candidate) => candidate.id === assetId) ?? (assetDetailData?.item.id === assetId ? assetDetailData.item : null);
    const request = item?.isPinned ? chartWallApiService.removeWatchlistAsset(assetId) : chartWallApiService.addWatchlistAsset(assetId);
    void request.then(() => {
      setAssetDetailData((current) => (current?.item.id === assetId ? { ...current, item: { ...current.item, isPinned: !current.item.isPinned } } : current));
      return reload();
    });
  };

  const handleCompare = (assetId: string): void => {
    setCompareAssetIds((current) => (current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId].slice(-6)));
  };

  const handleFundCatalogSync = async (): Promise<void> => {
    setIsFundCatalogSyncing(true);
    setFundImportMessage(null);
    try {
      const response = await chartWallApiService.syncEastmoneyFundCatalog();
      setFundImportMessage(`基金目录已同步，${response.summary.totalCount.toLocaleString("en-US")} 只；快照更新 ${response.metricSnapshotsUpdated.toLocaleString("en-US")} 只`);
      await fundDirectoryQuery.reload();
      await reload();
    } catch (nextError) {
      setFundImportMessage(nextError instanceof Error ? nextError.message : "基金目录同步失败");
    } finally {
      setIsFundCatalogSyncing(false);
    }
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

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams());
  };

  const currentSearch = getSearchWithout(searchParams, ["from"]);
  const assetDetailReturnPath = getAssetDetailReturnPath(searchParams);
  const assetDetailReturnLabel = getAssetDetailReturnLabel(assetDetailReturnPath);
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
            <SidebarButton active={activeView === "chart-wall"} label="图表墙" title="全市场图表墙" to={`/chart-wall${currentSearch}`}>
              <BarChart3 size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "fund-directory"} label="基金目录" title="基金目录" to={`/funds${currentSearch}`}>
              <BookOpen size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "universe"} label="资产宇宙" title="资产宇宙" to={`/universe${currentSearch}`}>
              <Network size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "scanner"} label="机会扫描" title="机会扫描" to={`/scanner${currentSearch}`}>
              <Sparkles size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "watchlist"} label="自选" title="自选图表墙" to={`/watchlist${currentSearch}`}>
              <Star size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "tasks"} label="任务中心" title="任务中心" to={`/tasks${currentSearch}`}>
              <ListChecks size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "data-health"} label="数据状态" title="数据源与任务状态" to={`/data-health${currentSearch}`}>
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
            <p className="workspace-header__eyebrow">真实数据源: {data?.chartWall.sources.join(" / ") || "加载中"}</p>
            <h1>{activeView === "asset-detail" && selectedItem ? selectedItem.name : viewTitles[activeView]}</h1>
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
            onClick={() => {
              navigate(`/tasks${currentSearch}`);
            }}
          />
          <IconButton label="刷新数据" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCcw size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      {activeView === "asset-detail" ? (
        <section className="control-strip control-strip--detail" aria-label="详情图表控制">
          <RangePicker value={range} onChange={(value) => setQueryValue("range", value, defaultFilters.range)} />
          <TimeframePicker value={timeframe} onChange={(value) => setQueryValue("timeframe", value, defaultFilters.timeframe)} />
          <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? "刷新中" : "重新采集"}
          </Button>
        </section>
      ) : activeView === "fund-directory" || activeView === "tasks" ? null : (
        <>
          <section className="control-strip" aria-label="图表控制">
            <Select id="market-filter" label="市场" value={market} onChange={(value) => setQueryValue("market", value, defaultFilters.market)} options={facetOptions("全部市场", data?.chartWall.facets?.markets, marketFallbackOptions)} />
            <Select id="asset-type-filter" label="品种" value={assetType} onChange={(value) => setQueryValue("assetType", value, defaultFilters.assetType)} options={facetOptions("全部品种", data?.chartWall.facets?.assetTypes, assetTypeFallbackOptions)} />
            <Select id="level-filter" label="层级" value={level} onChange={(value) => setQueryValue("level", value, defaultFilters.level)} options={facetOptions("全部层级", data?.chartWall.facets?.levels, levelFallbackOptions)} />
            <Select id="signal-filter" label="信号" value={signal} onChange={(value) => setQueryValue("signal", value, defaultFilters.signal)} options={facetOptions("全部信号", data?.chartWall.facets?.signals, signalFallbackOptions)} />
            <Select id="sort-filter" label="排序" value={sort} onChange={(value) => setSortQueryValue(value, defaultOrderForSort(value))} options={sortOptions} />
            <Select id="sort-order-filter" label="方向" value={order} onChange={(value) => setSortQueryValue(sort, getSortOrder(value))} options={sortOrderOptions} />
            <RangePicker value={range} onChange={(value) => setQueryValue("range", value, defaultFilters.range)} />
            <TimeframePicker value={timeframe} onChange={(value) => setQueryValue("timeframe", value, defaultFilters.timeframe)} />
            <div className="view-mode-toggle" aria-label="图表墙视图">
              <IconButton label="卡片视图" className={viewMode === "grid" ? "gi-icon-button--active" : ""} onClick={() => setQueryValue("view", "grid", "grid")}>
                <Grid3X3 size={17} aria-hidden="true" />
              </IconButton>
              <IconButton label="表格视图" className={viewMode === "table" ? "gi-icon-button--active" : ""} onClick={() => setQueryValue("view", "table", "grid")}>
                <Table2 size={17} aria-hidden="true" />
              </IconButton>
            </div>
            <Button variant="ghost" onClick={resetFilters}>
              重置
            </Button>
            <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? "刷新中" : "重新采集"}
            </Button>
          </section>

          <ActiveFilterChips filters={{ market, assetType, level, signal, sort, order, search }} onReset={resetFilters} />
        </>
      )}
      {data && activeView === "chart-wall" && assetType === "fund" && <FundScopeStrip data={data} market={market} />}

      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorState title="行情加载失败" message={error} />}

      {!isLoading && !error && data && (
        <>
          {activeView !== "asset-detail" && activeView !== "fund-directory" && activeView !== "tasks" && (
            <>
              <SummaryStrip data={data} visibleSearchCount={filteredItems.length} />
              <BreadthStrip data={data} />
              {activeView === "chart-wall" && (
                <>
                  <MarketPulseBoard items={filteredItems} activeMarket={market} onMarketSelect={(value) => setQueryValue("market", value, defaultFilters.market)} />
                  <OpportunityLeaderboard items={filteredItems} onSelect={selectAsset} onCompare={handleCompare} />
                </>
              )}
            </>
          )}

          {activeView === "chart-wall" && (
            <section className="market-layout">
              <section className="chart-wall-section">
                <SectionHeader
                  title="走势总览"
                  description={`${rangeLabel(data.chartWall.range)} / ${timeframeLabel(data.chartWall.timeframe)} / ${sortDisplayLabel(sort)} ${sortOrderLabel(order)} / ${filteredItems.length} 个资产`}
                  generatedAt={data.chartWall.generatedAt}
                />
                <ComparePanel compareData={compareData} compareAssetIds={compareAssetIds} allItems={chartItems} onRemove={handleCompare} onClear={() => setCompareAssetIds([])} />
                {viewMode === "grid" ? (
                  <ChartGrid items={filteredItems} sort={sort} onSelect={selectAsset} onPin={handlePin} onCompare={handleCompare} />
                ) : (
                  <ExchangeTable items={filteredItems} sort={sort} order={order} onSort={setSortQueryValue} onSelect={selectAsset} onPin={handlePin} onCompare={handleCompare} />
                )}
              </section>
              <aside className="event-rail" aria-label="机会事件">
                <EventListSection events={data.scannerEvents.events.slice(0, 8)} />
              </aside>
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
              sort={fundDirectory.sort}
              order={fundDirectory.order}
              page={fundDirectory.page}
              limit={fundDirectory.limit}
              message={fundImportMessage}
              importingCode={importingFundCode}
              isCatalogSyncing={isFundCatalogSyncing}
              onKeywordChange={(value) => fundDirectory.setQueryValue("fundKeyword", value, "")}
              onFundTypeChange={(value) => fundDirectory.setQueryValue("fundType", value, "all")}
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

          {activeView === "universe" && (
            <UniverseSection
              nodes={data.universeTree.nodes}
              filters={{ search, market, assetType, level }}
              onSelectAsset={selectAsset}
            />
          )}

          {activeView === "scanner" && (
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
            isAssetDetailLoading ? (
              <LoadingState />
            ) : assetDetailError ? (
              <ErrorState title="资产详情加载失败" message={assetDetailError} />
            ) : (
              <AssetDetailSection
                item={selectedItem}
                relatedItems={filteredItems.filter((item) => item.id !== selectedItem?.id && item.market === selectedItem?.market).slice(0, 8)}
                onSelect={selectAsset}
                onPin={handlePin}
                onCompare={handleCompare}
              />
            )
          )}

          {activeView === "watchlist" && (
            <WatchlistSection
              watchlists={data.watchlists.watchlists}
              chartItems={chartItems}
              onSelect={selectAsset}
              onCompare={handleCompare}
              onRemove={(assetId) => {
                void chartWallApiService.removeWatchlistAsset(assetId).then(() => reload());
              }}
            />
          )}

          {activeView === "tasks" && (
            <TaskCenterSection
              data={taskCenterQuery.data}
              error={taskCenterQuery.error}
              isLoading={taskCenterQuery.isLoading}
              onRefresh={() => {
                void taskCenterQuery.reload();
              }}
            />
          )}

          {activeView === "data-health" && (
            <DataHealthSection
              data={data}
              assetTable={
                <ExchangeTable
                  items={data.chartWall.items}
                  sort={data.chartWall.sort}
                  order={data.chartWall.order}
                  onSort={setSortQueryValue}
                  onSelect={selectAsset}
                  onPin={handlePin}
                  onCompare={handleCompare}
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
};

function SidebarButton({ active, title, label, children, to }: SidebarButtonProps): JSX.Element {
  return (
    <NavLink className={`sidebar-nav__item ${active ? "sidebar-nav__item--active" : ""}`} title={title} aria-current={active ? "page" : undefined} to={to}>
      {children}
      <span>{label}</span>
    </NavLink>
  );
}

function ActiveFilterChips({ filters, onReset }: { filters: Record<string, string>; onReset(): void }): JSX.Element | null {
  const activeEntries = Object.entries(filters).filter(([key, value]) => !isDefaultFilterValue(key, value));

  if (activeEntries.length === 0) {
    return null;
  }

  return (
    <section className="active-filter-strip" aria-label="当前筛选">
      {activeEntries.map(([key, value]) => (
        <FilterChip key={key} label={`${filterLabel(key)}: ${activeFilterValueLabel(key, value)}`} />
      ))}
      <FilterChip label="清空筛选" onClick={onReset} />
    </section>
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

function ChartGrid({ items, sort, onSelect, onPin, onCompare }: { items: ChartWallItem[]; sort?: string; onSelect(assetId: string): void; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  if (items.length === 0) {
    return <EmptyState title="没有匹配资产" description="当前筛选条件没有命中已采集的真实资产。" />;
  }

  return (
    <div className="chart-wall-grid">
      {items.map((item) => (
        <AssetChartCard key={item.id} item={item} sort={sort} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
      ))}
    </div>
  );
}

function EventListSection({ events }: { events: ScannerEventsResponse["events"] }): JSX.Element {
  return (
    <>
      <SectionHeader title="机会事件" description="MACD、突破、多周期共振" />
      {events.length === 0 ? (
        <EmptyState title="暂无事件" description="当前采集结果没有触发突破或 MACD 事件。" />
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <article key={event.id} className="event-card">
              <div>
                <strong>{event.asset?.name ?? event.asset?.symbol ?? event.assetId}</strong>
                <span>{event.severity}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function getActiveView(pathname: string): ActiveView {
  if (pathname.startsWith("/funds")) {
    return "fund-directory";
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

  return `/chart-wall${getSearchWithout(searchParams, ["from"])}`;
}

function getAssetDetailReturnLabel(path: string): string {
  if (path.startsWith("/funds")) {
    return "基金目录";
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

  return ["/chart-wall", "/funds", "/universe", "/scanner", "/watchlist", "/tasks", "/data-health"].some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

function getSearchValue(searchParams: URLSearchParams, name: string, fallback: string): string {
  return searchParams.get(name) ?? fallback;
}

function getViewMode(value: string): ViewMode {
  return value === "table" ? "table" : "grid";
}

function getSortOrder(value: string): ChartWallSortOrder {
  return value === "asc" ? "asc" : "desc";
}

function toggleSortOrder(value: ChartWallSortOrder): ChartWallSortOrder {
  return value === "desc" ? "asc" : "desc";
}

function defaultOrderForSort(sort: string): ChartWallSortOrder {
  return sort === "symbol" || sort === "market" || sort === "asset_type" ? "asc" : "desc";
}

function sortDisplayLabel(sort: string): string {
  return optionLabel(sortOptions, sort);
}

function sortOrderLabel(order: ChartWallSortOrder): string {
  return optionLabel(sortOrderOptions, order);
}

function facetOptions(allLabel: string, facets: ChartWallFacet[] | undefined, fallback: ControlOption[]): ControlOption[] {
  const hasFacetCounts = Boolean(facets);
  const countByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.count]));
  const labelByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.label]));
  const fallbackValues = new Set(fallback.map((option) => option.value));
  const allFacetCount = facets?.find((facet) => facet.value === "all")?.count;
  const facetExtras = (facets ?? [])
    .filter((facet) => facet.value !== "all" && !fallbackValues.has(facet.value))
    .map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }));
  const totalCount = allFacetCount ?? (facets ?? []).filter((facet) => facet.value !== "all").reduce((sum, facet) => sum + facet.count, 0);

  return [
    { value: "all", label: allLabel, count: hasFacetCounts ? totalCount : undefined },
    ...fallback.map((option) => {
      const count = countByValue.get(option.value);
      return {
        ...option,
        label: labelByValue.get(option.value) ?? option.label,
        count: typeof count === "number" ? count : hasFacetCounts ? 0 : undefined
      };
    }),
    ...facetExtras
  ];
}

function filterLabel(key: string): string {
  const labels: Record<string, string> = {
    market: "市场",
    assetType: "品种",
    level: "层级",
    signal: "信号",
    sort: "排序",
    order: "方向",
    search: "搜索"
  };
  return labels[key] ?? key;
}

function isDefaultFilterValue(key: string, value: string): boolean {
  return value.length === 0 || value === "all" || (key === "sort" && value === defaultFilters.sort) || (key === "order" && value === defaultFilters.order);
}

function activeFilterValueLabel(key: string, value: string): string {
  if (key === "assetType") {
    return optionLabel(assetTypeFallbackOptions, value);
  }

  if (key === "level") {
    return optionLabel(levelFallbackOptions, value);
  }

  if (key === "signal") {
    return optionLabel(signalFallbackOptions, value);
  }

  if (key === "sort") {
    return optionLabel(sortOptions, value);
  }

  if (key === "order") {
    return optionLabel(sortOrderOptions, value);
  }

  return value;
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
