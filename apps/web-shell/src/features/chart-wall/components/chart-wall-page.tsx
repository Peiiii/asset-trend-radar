import {
  Activity,
  BarChart3,
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
import { AppShell, Button, EmptyState, ErrorState, FilterChip, IconButton, LoadingState, RangePicker, Select, SparklineChart, TechnicalChart, TimeframePicker } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ChartWallFacet, ChartWallItem, ChartWallSummary, FundSearchResult, ScannerEventsResponse, UniverseTreeNode, WatchlistSummary } from "@gold-insights/market-domain";
import type { ChartWallFilters, ChartWallPageData, CompareData } from "@/shared/types/api.types";
import { formatDateTime, formatPrice } from "@/shared/utils/format-number.utils";
import { AssetChartCard } from "./asset-chart-card";
import { chartWallApiService } from "../services/chart-wall-api.service";
import { useChartWallQuery } from "../hooks/use-chart-wall-query";

type ActiveView = "chart-wall" | "universe" | "scanner" | "asset-detail" | "watchlist" | "data-health";
type ViewMode = "grid" | "table";

const viewTitles: Record<ActiveView, string> = {
  "chart-wall": "全市场图表墙",
  universe: "资产宇宙",
  scanner: "机会扫描",
  "asset-detail": "单资产详情",
  watchlist: "自选图表墙",
  "data-health": "数据源与任务状态"
};

const defaultFilters = {
  range: "6m",
  timeframe: "1d",
  market: "all",
  assetType: "all",
  level: "all",
  sort: "trend_score",
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
  { value: "return", label: "当前跨度收益", description: "跟随所选时间跨度" },
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
const scannerEventOptions: ControlOption[] = [
  { value: "all", label: "全部事件" },
  { value: "macd_golden_cross", label: "MACD 金叉" },
  { value: "macd_dead_cross", label: "MACD 死叉" },
  { value: "price_breakout_20d", label: "20D 突破" },
  { value: "price_breakout_60d", label: "60D 突破" },
  { value: "relative_strength_leader", label: "相对强势" }
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
  const signal = getSearchValue(searchParams, "signal", defaultFilters.signal);
  const viewMode = getViewMode(getSearchValue(searchParams, "view", "grid"));
  const search = getSearchValue(searchParams, "q", "");
  const scannerEventType = getSearchValue(searchParams, "eventType", "all");
  const scannerMinSeverity = getSearchValue(searchParams, "severity", "0");
  const [compareAssetIds, setCompareAssetIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [fundKeyword, setFundKeyword] = useState("");
  const [fundResults, setFundResults] = useState<FundSearchResult[]>([]);
  const [fundSearchError, setFundSearchError] = useState<string | null>(null);
  const [isFundSearching, setIsFundSearching] = useState(false);
  const [importingFundCode, setImportingFundCode] = useState<string | null>(null);
  const [fundImportMessage, setFundImportMessage] = useState<string | null>(null);

  const setQueryValue = useCallback((name: string, value: string, fallback = ""): void => {
    const next = new URLSearchParams(searchParams);
    if (value === fallback || value.length === 0) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

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
      signal
    }),
    [assetType, level, market, range, signal, sort, timeframe]
  );
  const { data, error, isLoading, isRefreshing, refresh, reload } = useChartWallQuery(filters);
  const comparedSet = useMemo(() => new Set(compareAssetIds), [compareAssetIds]);
  const chartItems = useMemo(() => (data?.chartWall.items ?? []).map((item) => ({ ...item, isCompared: comparedSet.has(item.id) })), [comparedSet, data]);
  const knownFundCodes = useMemo(() => new Set(chartItems.filter((item) => item.dataSource === "eastmoney").map((item) => item.symbol)), [chartItems]);

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

  const selectedItem = useMemo(() => chartItems.find((item) => item.id === routeAssetId) ?? filteredItems[0] ?? chartItems[0] ?? null, [chartItems, filteredItems, routeAssetId]);

  useEffect(() => {
    if (compareAssetIds.length < 2) {
      setCompareData(null);
      return;
    }

    void chartWallApiService.fetchCompare(compareAssetIds, range, timeframe).then(setCompareData).catch(() => setCompareData(null));
  }, [compareAssetIds, range, timeframe]);

  const handleRefresh = (): void => {
    void refresh();
  };

  const handlePin = (assetId: string): void => {
    const item = chartItems.find((candidate) => candidate.id === assetId);
    const request = item?.isPinned ? chartWallApiService.removeWatchlistAsset(assetId) : chartWallApiService.addWatchlistAsset(assetId);
    void request.then(() => reload());
  };

  const handleCompare = (assetId: string): void => {
    setCompareAssetIds((current) => (current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId].slice(-6)));
  };

  const handleFundSearch = async (): Promise<void> => {
    const keyword = fundKeyword.trim();

    if (keyword.length === 0) {
      setFundResults([]);
      setFundSearchError(null);
      return;
    }

    setIsFundSearching(true);
    setFundSearchError(null);
    setFundImportMessage(null);
    try {
      const response = await chartWallApiService.searchEastmoneyFunds(keyword);
      setFundResults(response.results);
    } catch (nextError) {
      setFundSearchError(nextError instanceof Error ? nextError.message : "基金搜索失败");
    } finally {
      setIsFundSearching(false);
    }
  };

  const handleFundImport = async (code: string): Promise<void> => {
    setImportingFundCode(code);
    setFundSearchError(null);
    setFundImportMessage(null);
    try {
      const response = await chartWallApiService.importEastmoneyFund(code);
      const next = new URLSearchParams(searchParams);
      next.set("market", "基金");
      next.set("assetType", "fund");
      next.set("timeframe", "1d");
      setSearchParams(next);
      setFundImportMessage(`${response.asset.name} 已导入，${response.barsImported.toLocaleString("en-US")} 条净值`);
      await reload();
    } catch (nextError) {
      setFundSearchError(nextError instanceof Error ? nextError.message : "基金导入失败");
    } finally {
      setImportingFundCode(null);
    }
  };

  const selectAsset = (assetId: string): void => {
    navigate({ pathname: `/assets/${assetId}`, search: location.search });
  };

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams());
  };

  const currentSearch = location.search;
  const assetDetailPath = `/assets/${routeAssetId ?? selectedItem?.id ?? chartItems[0]?.id ?? "us-nvda"}`;

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
            <SidebarButton active={activeView === "universe"} label="资产宇宙" title="资产宇宙" to={`/universe${currentSearch}`}>
              <Network size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "scanner"} label="机会扫描" title="机会扫描" to={`/scanner${currentSearch}`}>
              <Sparkles size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "asset-detail"} label="资产详情" title="单资产详情" to={`${assetDetailPath}${currentSearch}`}>
              <Activity size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "watchlist"} label="自选" title="自选图表墙" to={`/watchlist${currentSearch}`}>
              <Star size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "data-health"} label="数据状态" title="数据源与任务状态" to={`/data-health${currentSearch}`}>
              <Database size={18} aria-hidden="true" />
            </SidebarButton>
          </nav>
        </>
      }
    >
      <header className="workspace-header">
        <div>
          <p className="workspace-header__eyebrow">真实数据源: {data?.chartWall.sources.join(" / ") || "加载中"}</p>
          <h1>{viewTitles[activeView]}</h1>
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
          <IconButton label="刷新数据" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCcw size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <section className="control-strip" aria-label="图表控制">
        <Select id="market-filter" label="市场" value={market} onChange={(value) => setQueryValue("market", value, defaultFilters.market)} options={facetOptions("全部市场", data?.chartWall.facets?.markets, marketFallbackOptions)} />
        <Select id="asset-type-filter" label="品种" value={assetType} onChange={(value) => setQueryValue("assetType", value, defaultFilters.assetType)} options={facetOptions("全部品种", data?.chartWall.facets?.assetTypes, assetTypeFallbackOptions)} />
        <Select id="level-filter" label="层级" value={level} onChange={(value) => setQueryValue("level", value, defaultFilters.level)} options={facetOptions("全部层级", data?.chartWall.facets?.levels, levelFallbackOptions)} />
        <Select id="signal-filter" label="信号" value={signal} onChange={(value) => setQueryValue("signal", value, defaultFilters.signal)} options={facetOptions("全部信号", data?.chartWall.facets?.signals, signalFallbackOptions)} />
        <Select id="sort-filter" label="排序" value={sort} onChange={(value) => setQueryValue("sort", value, defaultFilters.sort)} options={sortOptions} />
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

      <ActiveFilterChips filters={{ market, assetType, level, signal, sort, search }} onReset={resetFilters} />
      {data && assetType === "fund" && <FundScopeStrip data={data} market={market} />}
      {activeView === "chart-wall" && (
        <FundDiscoveryPanel
          keyword={fundKeyword}
          results={fundResults}
          knownFundCodes={knownFundCodes}
          error={fundSearchError}
          message={fundImportMessage}
          isSearching={isFundSearching}
          importingCode={importingFundCode}
          onKeywordChange={setFundKeyword}
          onSearch={() => {
            void handleFundSearch();
          }}
          onImport={(code) => {
            void handleFundImport(code);
          }}
        />
      )}

      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorState title="行情加载失败" message={error} />}

      {!isLoading && !error && data && (
        <>
          <SummaryStrip data={data} visibleSearchCount={filteredItems.length} />
          <BreadthStrip data={data} />

          {activeView === "chart-wall" && (
            <section className="market-layout">
              <section className="chart-wall-section">
                <SectionHeader
                  title="走势总览"
                  description={`${rangeLabel(data.chartWall.range)} / ${timeframeLabel(data.chartWall.timeframe)} / ${filteredItems.length} 个资产`}
                  generatedAt={data.chartWall.generatedAt}
                />
                {viewMode === "grid" ? (
                  <ChartGrid items={filteredItems} onSelect={selectAsset} onPin={handlePin} onCompare={handleCompare} />
                ) : (
                  <ExchangeTable items={filteredItems} sort={sort} onSort={(value) => setQueryValue("sort", value, defaultFilters.sort)} onSelect={selectAsset} onPin={handlePin} onCompare={handleCompare} />
                )}
                <ComparePanel compareData={compareData} compareAssetIds={compareAssetIds} allItems={chartItems} onRemove={handleCompare} onClear={() => setCompareAssetIds([])} />
              </section>
              <aside className="event-rail" aria-label="机会事件">
                <EventListSection events={data.scannerEvents.events.slice(0, 8)} />
              </aside>
            </section>
          )}

          {activeView === "universe" && <UniverseSection nodes={data.universeTree.nodes} onSelectAsset={selectAsset} />}

          {activeView === "scanner" && (
            <ScannerSection
              scannerEvents={data.scannerEvents}
              eventType={scannerEventType}
              minSeverity={scannerMinSeverity}
              onEventTypeChange={(value) => setQueryValue("eventType", value, "all")}
              onMinSeverityChange={(value) => setQueryValue("severity", value, "0")}
              onSelectAsset={selectAsset}
            />
          )}

          {activeView === "asset-detail" && (
            <AssetDetailSection item={selectedItem} relatedItems={filteredItems.filter((item) => item.id !== selectedItem?.id && item.market === selectedItem?.market).slice(0, 8)} onPin={handlePin} onCompare={handleCompare} />
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

          {activeView === "data-health" && <DataHealthSection data={data} />}
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
  const activeEntries = Object.entries(filters).filter(([, value]) => value !== "all" && value !== "trend_score" && value.length > 0);

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

type FundDiscoveryPanelProps = {
  keyword: string;
  results: FundSearchResult[];
  knownFundCodes: Set<string>;
  error: string | null;
  message: string | null;
  isSearching: boolean;
  importingCode: string | null;
  onKeywordChange(value: string): void;
  onSearch(): void;
  onImport(code: string): void;
};

function FundDiscoveryPanel({
  keyword,
  results,
  knownFundCodes,
  error,
  message,
  isSearching,
  importingCode,
  onKeywordChange,
  onSearch,
  onImport
}: FundDiscoveryPanelProps): JSX.Element {
  return (
    <section className="fund-discovery-panel" aria-label="基金发现">
      <form
        className="fund-discovery-panel__search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <div>
          <strong>基金发现</strong>
          <span>东方财富基金库</span>
        </div>
        <label className="search-control" htmlFor="fund-discovery-search">
          <Search size={17} aria-hidden="true" />
          <input id="fund-discovery-search" value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="005827、白酒、半导体" />
        </label>
        <Button type="submit" variant="secondary" disabled={isSearching}>
          {isSearching ? "搜索中" : "搜索"}
        </Button>
      </form>
      {(error || message) && <p className={error ? "fund-discovery-panel__status fund-discovery-panel__status--error" : "fund-discovery-panel__status"}>{error ?? message}</p>}
      {results.length > 0 && (
        <div className="fund-result-strip">
          {results.map((result) => {
            const isKnown = knownFundCodes.has(result.code);
            const isImporting = importingCode === result.code;
            return (
              <article key={result.code} className="fund-result-card">
                <div>
                  <strong>{result.name}</strong>
                  <span>{result.code}</span>
                </div>
                <small>{[result.fundType, result.company, ...result.themes.slice(0, 2)].filter(Boolean).join(" / ")}</small>
                <footer>
                  <span>{result.latestNav === null ? "净值暂无" : `${result.latestNav.toFixed(4)} / ${result.latestNavDate ?? "--"}`}</span>
                  <Button variant={isKnown ? "ghost" : "secondary"} disabled={isImporting} onClick={() => onImport(result.code)}>
                    {isImporting ? "导入中" : isKnown ? "更新" : "导入"}
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryStrip({ data, visibleSearchCount }: { data: ChartWallPageData; visibleSearchCount: number }): JSX.Element {
  const summary = getSummary(data);
  const rawFileCount = data.dataHealth.rawFileCount ?? 0;

  return (
    <section className="summary-strip" aria-label="数据状态">
      <SummaryCard label="可交易资产" value={`${summary.visibleItems}/${summary.totalUniverseAssets}`} />
      <SummaryCard label="搜索可见" value={visibleSearchCount.toString()} />
      <SummaryCard label="K 线记录" value={data.dataHealth.barCount.toLocaleString("en-US")} />
      <SummaryCard label="Raw 文件" value={rawFileCount.toLocaleString("en-US")} />
      <SummaryCard label="最新 K 线" value={formatDateTime(data.dataHealth.latestBarAt)} />
      <SummaryCard label="最近采集" value={formatDateTime(data.dataHealth.lastIngestionAt)} />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BreadthStrip({ data }: { data: ChartWallPageData }): JSX.Element {
  const summary = getSummary(data);

  return (
    <section className="breadth-strip" aria-label="市场宽度">
      <MetricPill label="上涨" value={summary.positiveItems} tone="positive" />
      <MetricPill label="下跌" value={summary.negativeItems} tone="negative" />
      <MetricPill label="强趋势" value={summary.strongTrendItems} tone="positive" />
      <MetricPill label="偏弱" value={summary.weakTrendItems} tone="negative" />
      <MetricPill label="有事件" value={summary.eventfulItems} tone="blue" />
      <MetricPill label="平均收益" value={formatPercent(summary.averageReturnPct)} tone={(summary.averageReturnPct ?? 0) >= 0 ? "positive" : "negative"} />
      <MetricPill label="平均量比" value={summary.averageVolumeRatio === null ? "暂无" : `${summary.averageVolumeRatio.toFixed(2)}x`} tone="neutral" />
    </section>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: number | string; tone: "positive" | "negative" | "blue" | "neutral" }): JSX.Element {
  return (
    <article className={`metric-pill metric-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

function ChartGrid({ items, onSelect, onPin, onCompare }: { items: ChartWallItem[]; onSelect(assetId: string): void; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  if (items.length === 0) {
    return <EmptyState title="没有匹配资产" description="当前筛选条件没有命中已采集的真实资产。" />;
  }

  return (
    <div className="chart-wall-grid">
      {items.map((item) => (
        <AssetChartCard key={item.id} item={item} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
      ))}
    </div>
  );
}

function ExchangeTable({ items, sort, onSort, onSelect, onPin, onCompare }: { items: ChartWallItem[]; sort: string; onSort(value: string): void; onSelect(assetId: string): void; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  if (items.length === 0) {
    return <EmptyState title="没有匹配资产" description="换一个市场、品种、信号或搜索词试试。" />;
  }

  return (
    <div className="asset-table-wrapper asset-table-wrapper--dense">
      <table>
        <thead>
          <tr>
            <SortableHeader label="资产" sortValue="symbol" currentSort={sort} onSort={onSort} />
            <th>市场</th>
            <th>品种</th>
            <th>最新价</th>
            <SortableHeader label="1D" sortValue="return_1d" currentSort={sort} onSort={onSort} />
            <SortableHeader label="1M" sortValue="return_1m" currentSort={sort} onSort={onSort} />
            <SortableHeader label="3M" sortValue="return_3m" currentSort={sort} onSort={onSort} />
            <SortableHeader label="6M" sortValue="return_6m" currentSort={sort} onSort={onSort} />
            <SortableHeader label="1Y" sortValue="return_1y" currentSort={sort} onSort={onSort} />
            <SortableHeader label="量比" sortValue="volume_ratio" currentSort={sort} onSort={onSort} />
            <SortableHeader label="回撤" sortValue="drawdown" currentSort={sort} onSort={onSort} />
            <SortableHeader label="趋势" sortValue="trend_score" currentSort={sort} onSort={onSort} />
            <th>MACD</th>
            <SortableHeader label="事件" sortValue="event_count" currentSort={sort} onSort={onSort} />
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onDoubleClick={() => onSelect(item.id)}>
              <td>
                <button type="button" className="asset-table-identity" onClick={() => onSelect(item.id)}>
                  <strong>{item.name}</strong>
                  <span>{item.symbol}</span>
                </button>
              </td>
              <td>{item.market}</td>
              <td>{assetTypeLabel(item.assetType)}</td>
              <td>{formatPrice(item.lastPrice, item.currency)}</td>
              <PercentCell value={item.return1d} />
              <PercentCell value={item.return1m} />
              <PercentCell value={item.return3m} />
              <PercentCell value={item.return6m} />
              <PercentCell value={item.return1y} />
              <td>{typeof item.volumeRatio === "number" ? `${item.volumeRatio.toFixed(2)}x` : "暂无"}</td>
              <PercentCell value={item.drawdownPct} />
              <td>{item.trendScore}</td>
              <td>{macdLabel(item.macdState)}</td>
              <td>{item.events.length}</td>
              <td>
                <div className="row-actions">
                  <button type="button" onClick={() => onPin(item.id)}>{item.isPinned ? "取消自选" : "自选"}</button>
                  <button type="button" onClick={() => onCompare(item.id)}>{item.isCompared ? "取消对比" : "对比"}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({ label, sortValue, currentSort, onSort }: { label: string; sortValue: string; currentSort: string; onSort(value: string): void }): JSX.Element {
  return (
    <th>
      <button type="button" className={currentSort === sortValue ? "sortable-header sortable-header--active" : "sortable-header"} onClick={() => onSort(sortValue)}>
        {label}
      </button>
    </th>
  );
}

function PercentCell({ value }: { value: number | null }): JSX.Element {
  const tone = value === null ? "neutral" : value >= 0 ? "positive" : "negative";
  return <td className={`percent-cell percent-cell--${tone}`}>{formatPercent(value)}</td>;
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

function UniverseSection({ nodes, onSelectAsset }: { nodes: UniverseTreeNode[]; onSelectAsset(assetId: string): void }): JSX.Element {
  return (
    <section className="single-view-section">
      <SectionHeader title="资产宇宙" description="从大类资产到地区、板块、主题、基金、商品和重点公司" />
      <div className="universe-grid">
        {nodes.map((node) => (
          <UniverseNodeCard key={node.id} node={node} onSelectAsset={onSelectAsset} />
        ))}
      </div>
    </section>
  );
}

function UniverseNodeCard({ node, onSelectAsset }: { node: UniverseTreeNode; onSelectAsset(assetId: string): void }): JSX.Element {
  return (
    <article className="universe-node-card">
      <header>
        <strong>{node.label}</strong>
        <span>{node.count}</span>
      </header>
      {node.children.length > 0 && (
        <div className="universe-node-card__children">
          {node.children.map((child) => (
            <UniverseNodeCard key={child.id} node={child} onSelectAsset={onSelectAsset} />
          ))}
        </div>
      )}
      <div className="universe-node-card__assets">
        {node.assets.slice(0, 14).map((asset) => (
          <button key={asset.id} type="button" onClick={() => onSelectAsset(asset.id)}>
            <span>{asset.name}</span>
            <small>{asset.symbol}</small>
          </button>
        ))}
      </div>
    </article>
  );
}

function ScannerSection({
  scannerEvents,
  eventType,
  minSeverity,
  onEventTypeChange,
  onMinSeverityChange,
  onSelectAsset
}: {
  scannerEvents: ScannerEventsResponse;
  eventType: string;
  minSeverity: string;
  onEventTypeChange(value: string): void;
  onMinSeverityChange(value: string): void;
  onSelectAsset(assetId: string): void;
}): JSX.Element {
  const filteredEvents = scannerEvents.events.filter((event) => (eventType === "all" || event.eventType === eventType) && event.severity >= Number(minSeverity));

  return (
    <section className="single-view-section">
      <SectionHeader title="机会扫描" description={`${filteredEvents.length}/${scannerEvents.events.length} 个真实数据触发事件`} generatedAt={scannerEvents.generatedAt} />
      <div className="sub-control-strip">
        <Select id="scanner-event-type" label="事件" value={eventType} onChange={onEventTypeChange} options={scannerEventOptions} />
        <Select
          id="scanner-severity"
          label="强度"
          value={minSeverity}
          onChange={onMinSeverityChange}
          options={[
            { value: "0", label: "全部" },
            { value: "2", label: ">= 2" },
            { value: "3", label: ">= 3" },
            { value: "4", label: ">= 4" }
          ]}
        />
      </div>
      {filteredEvents.length === 0 ? (
        <EmptyState title="暂无机会事件" description="当前真实行情没有触发所选扫描规则。" />
      ) : (
        <div className="scanner-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>资产</th>
                <th>市场</th>
                <th>事件</th>
                <th>严重度</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} onClick={() => onSelectAsset(event.assetId)}>
                  <td>
                    <strong>{event.asset?.name ?? event.asset?.symbol ?? event.assetId}</strong>
                    <small>{event.asset?.symbol ?? event.assetId}</small>
                  </td>
                  <td>{event.asset?.market ?? "-"}</td>
                  <td>{event.title}</td>
                  <td>{event.severity}</td>
                  <td>{event.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AssetDetailSection({ item, relatedItems, onPin, onCompare }: { item: ChartWallItem | null; relatedItems: ChartWallItem[]; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  if (!item) {
    return <EmptyState title="没有可查看资产" description="当前筛选条件下没有资产。" />;
  }

  return (
    <section className="single-view-section">
      <SectionHeader title={`${item.name} / ${item.symbol}`} description={`${item.market} / ${assetTypeLabel(item.assetType)} / ${item.exchange} / ${item.source ?? item.dataSource ?? "unknown"}`} />
      <div className="asset-detail-grid">
        <article className="asset-detail-main">
          <div className="asset-detail-main__hero">
            <DetailMetric label="最新价" value={formatPrice(item.lastPrice, item.currency)} />
            <DetailMetric label="区间收益" value={formatPercent(item.returnPct)} />
            <DetailMetric label="趋势分" value={String(item.trendScore)} />
            <DetailMetric label="量比" value={typeof item.volumeRatio === "number" ? `${item.volumeRatio.toFixed(2)}x` : "暂无"} />
            <DetailMetric label="当前回撤" value={formatPercent(item.drawdownPct)} />
            <DetailMetric label="数据点" value={(item.dataPointCount ?? item.sparkline.length).toString()} />
          </div>
          <TechnicalChart points={item.sparkline} indicators={item.indicators} height={230} showMacdSignalLines />
          <div className="return-matrix">
            <DetailMetric label="1D" value={formatPercent(item.return1d)} />
            <DetailMetric label="1W" value={formatPercent(item.return1w)} />
            <DetailMetric label="1M" value={formatPercent(item.return1m)} />
            <DetailMetric label="3M" value={formatPercent(item.return3m)} />
            <DetailMetric label="6M" value={formatPercent(item.return6m)} />
            <DetailMetric label="1Y" value={formatPercent(item.return1y)} />
          </div>
          <div className="asset-detail-main__actions">
            <Button onClick={() => onPin(item.id)}>{item.isPinned ? "取消自选" : "加入自选"}</Button>
            <Button onClick={() => onCompare(item.id)} variant="ghost">
              {item.isCompared ? "取消对比" : "加入对比"}
            </Button>
          </div>
        </article>
        <article className="asset-detail-side">
          <h2>指标快照</h2>
          <dl>
            <DetailRow label="MACD" value={`${macdLabel(item.macdState)} / Hist ${formatNumber(item.macdHist)}`} />
            <DetailRow label="DIF / DEA" value={`${formatNumber(item.macdDif)} / ${formatNumber(item.macdDea)}`} />
            <DetailRow label="MA20 / MA50 / MA200" value={`${formatNumber(item.ma20)} / ${formatNumber(item.ma50)} / ${formatNumber(item.ma200)}`} />
            <DetailRow label="RSI14" value={formatNumber(item.rsi14)} />
            <DetailRow label="突破状态" value={breakoutLabel(item.breakoutState)} />
            <DetailRow label="最新时间" value={formatDateTime(item.latestBarAt)} />
          </dl>
        </article>
      </div>
      <SectionHeader title="触发事件" description={`${item.events.length} 个扫描事件`} />
      {item.events.length === 0 ? (
        <EmptyState title="暂无触发事件" description="该资产当前没有触发已配置的扫描规则。" />
      ) : (
        <div className="event-list event-list--wide">
          {item.events.map((event) => (
            <article key={event.id} className="event-card">
              <div>
                <strong>{event.title}</strong>
                <span>{event.severity}</span>
              </div>
              <p>{event.summary}</p>
            </article>
          ))}
        </div>
      )}
      <SectionHeader title="相关资产" description="同市场内的可比资产" />
      <ChartGrid items={relatedItems} onSelect={() => undefined} onPin={onPin} onCompare={onCompare} />
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function WatchlistSection({
  watchlists,
  chartItems,
  onSelect,
  onCompare,
  onRemove
}: {
  watchlists: WatchlistSummary[];
  chartItems: ChartWallItem[];
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
  onRemove(assetId: string): void;
}): JSX.Element {
  const assetIds = new Set(watchlists.flatMap((watchlist) => watchlist.assets.map((asset) => asset.id)));
  const items = chartItems.filter((item) => assetIds.has(item.id)).map((item) => ({ ...item, isPinned: true }));

  return (
    <section className="single-view-section">
      <SectionHeader title="自选图表墙" description={`${items.length} 个自选资产`} />
      {items.length === 0 ? (
        <EmptyState title="自选为空" description="在图表卡片或行情表上点击自选即可加入。" />
      ) : (
        <>
          <ChartGrid items={items} onSelect={onSelect} onPin={onRemove} onCompare={onCompare} />
          <div className="watchlist-meta">
            {watchlists.map((watchlist) => (
              <span key={watchlist.id}>{watchlist.name}: {watchlist.assets.length}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ComparePanel({
  compareData,
  compareAssetIds,
  allItems,
  onRemove,
  onClear
}: {
  compareData: CompareData | null;
  compareAssetIds: string[];
  allItems: ChartWallItem[];
  onRemove(assetId: string): void;
  onClear(): void;
}): JSX.Element | null {
  if (compareAssetIds.length < 2) {
    return null;
  }

  return (
    <section className="compare-panel">
      <SectionHeader title="多资产对比" description={`${compareAssetIds.length} 个资产`} />
      <div className="compare-token-row">
        {compareAssetIds.map((assetId) => {
          const item = allItems.find((candidate) => candidate.id === assetId);
          return (
            <button key={assetId} type="button" onClick={() => onRemove(assetId)}>
              {item?.name ?? item?.symbol ?? assetId}
              <X size={13} aria-hidden="true" />
            </button>
          );
        })}
        <button type="button" onClick={onClear}>清空</button>
      </div>
      {!compareData ? (
        <LoadingState />
      ) : (
        <div className="compare-grid">
          {compareData.assets.map(({ asset, bars }) => (
            <article key={asset.id}>
              <strong>{asset.name}</strong>
              <span className="compare-symbol">{asset.symbol}</span>
              <SparklineChart points={bars.map((bar) => ({ t: bar.ts, o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume }))} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DataHealthSection({ data }: { data: ChartWallPageData }): JSX.Element {
  const latestJob = data.dataHealth.latestJob ?? null;
  const latestJobTime = latestJob?.finishedAt ?? latestJob?.startedAt ?? null;
  const rawFileCount = data.dataHealth.rawFileCount ?? 0;
  const databaseSizeBytes = data.dataHealth.databaseSizeBytes ?? 0;
  const barsByTimeframe = data.dataHealth.barsByTimeframe ?? [];
  const barsBySource = data.dataHealth.barsBySource ?? [];

  return (
    <section className="single-view-section">
      <SectionHeader title="本地数据链路" description="SQLite / Raw JSONL / 多供应商真实数据" />
      <div className="data-health-grid">
        <DataHealthCard label="SQLite" value={data.dataHealth.databasePath} />
        <DataHealthCard label="Raw" value={data.dataHealth.rawDataPath} />
        <DataHealthCard label="数据库大小" value={formatBytes(databaseSizeBytes)} />
        <DataHealthCard label="Raw 文件数" value={rawFileCount.toLocaleString("en-US")} />
        <DataHealthCard label="同步任务" value={latestJob ? `${jobStatusLabel(latestJob.status)} / ${formatDateTime(latestJobTime)}` : "暂无"} />
        <DataHealthCard label="任务错误" value={latestJob?.errorMessage ?? "无"} />
      </div>
      <div className="provider-grid">
        {data.dataHealth.providers.map((provider) => (
          <article key={provider.id}>
            <ListChecks size={18} aria-hidden="true" />
            <strong>{provider.label}</strong>
            <span>{provider.status}</span>
            <small>{provider.assetCount} 个资产</small>
          </article>
        ))}
      </div>
      <div className="data-health-split">
        <MiniCountTable title="按周期" rows={barsByTimeframe.map((row) => ({ label: timeframeLabel(row.timeframe), count: row.count }))} />
        <MiniCountTable title="按来源" rows={barsBySource.map((row) => ({ label: row.source, count: row.count }))} />
      </div>
      <ExchangeTable items={data.chartWall.items} sort={data.chartWall.sort} onSort={() => undefined} onSelect={() => undefined} onPin={() => undefined} onCompare={() => undefined} />
    </section>
  );
}

function jobStatusLabel(status: string): string {
  if (status === "running") {
    return "同步中";
  }

  if (status === "success") {
    return "成功";
  }

  if (status === "failed") {
    return "失败";
  }

  return status;
}

function DataHealthCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MiniCountTable({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }): JSX.Element {
  return (
    <article className="mini-count-table">
      <h3>{title}</h3>
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{row.count.toLocaleString("en-US")}</strong>
        </div>
      ))}
    </article>
  );
}

function getSummary(data: ChartWallPageData): ChartWallSummary {
  const runtimeSummary = data.chartWall.summary as ChartWallSummary | undefined;

  if (runtimeSummary) {
    return runtimeSummary;
  }

  const items = data.chartWall.items;
  const latestTimestamp = Math.max(
    ...items
      .map((item) => (item.latestBarAt ? new Date(item.latestBarAt).getTime() : NaN))
      .filter((timestamp) => Number.isFinite(timestamp))
  );

  return {
    totalUniverseAssets: items.length,
    visibleItems: items.length,
    positiveItems: items.filter((item) => (item.returnPct ?? 0) > 0).length,
    negativeItems: items.filter((item) => (item.returnPct ?? 0) < 0).length,
    strongTrendItems: items.filter((item) => item.trendScore >= 30).length,
    weakTrendItems: items.filter((item) => item.trendScore <= -10).length,
    eventfulItems: items.filter((item) => item.events.length > 0).length,
    pinnedItems: items.filter((item) => item.isPinned).length,
    comparedItems: items.filter((item) => item.isCompared).length,
    averageReturnPct: average(items.map((item) => item.returnPct)),
    averageTrendScore: average(items.map((item) => item.trendScore)),
    averageVolumeRatio: average(items.map((item) => item.volumeRatio)),
    latestBarAt: Number.isFinite(latestTimestamp) ? new Date(latestTimestamp).toISOString() : null
  };
}

function average(values: Array<number | null | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
}

function getActiveView(pathname: string): ActiveView {
  if (pathname.startsWith("/universe")) {
    return "universe";
  }
  if (pathname.startsWith("/scanner")) {
    return "scanner";
  }
  if (pathname.startsWith("/watchlist")) {
    return "watchlist";
  }
  if (pathname.startsWith("/data-health")) {
    return "data-health";
  }
  if (pathname.startsWith("/assets/")) {
    return "asset-detail";
  }
  return "chart-wall";
}

function getSearchValue(searchParams: URLSearchParams, name: string, fallback: string): string {
  return searchParams.get(name) ?? fallback;
}

function getViewMode(value: string): ViewMode {
  return value === "table" ? "table" : "grid";
}

function facetOptions(allLabel: string, facets: ChartWallFacet[] | undefined, fallback: ControlOption[]): ControlOption[] {
  const countByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.count]));
  const labelByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.label]));
  const fallbackValues = new Set(fallback.map((option) => option.value));
  const allFacetCount = facets?.find((facet) => facet.value === "all")?.count;
  const facetExtras = (facets ?? [])
    .filter((facet) => facet.value !== "all" && !fallbackValues.has(facet.value))
    .map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }));
  const totalCount = allFacetCount ?? (facets ?? []).filter((facet) => facet.value !== "all").reduce((sum, facet) => sum + facet.count, 0);

  return [
    { value: "all", label: allLabel, count: totalCount > 0 ? totalCount : undefined },
    ...fallback.map((option) => {
      const count = countByValue.get(option.value);
      return {
        ...option,
        label: labelByValue.get(option.value) ?? option.label,
        count: typeof count === "number" && count > 0 ? count : undefined
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
    search: "搜索"
  };
  return labels[key] ?? key;
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

  return value;
}

function optionLabel(options: ControlOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function assetTypeLabel(assetType: string): string {
  return assetTypeFallbackOptions.find((option) => option.value === assetType)?.label ?? assetType;
}

function macdLabel(state: string): string {
  const labels: Record<string, string> = {
    "bullish-cross": "金叉",
    "bearish-cross": "死叉",
    "above-zero": "零轴上",
    "below-zero": "零轴下",
    neutral: "中性"
  };
  return labels[state] ?? state;
}

function breakoutLabel(state: string): string {
  if (state === "breakout-60d") {
    return "60D 突破";
  }
  if (state === "breakout-20d") {
    return "20D 突破";
  }
  if (state === "insufficient-data") {
    return "数据积累中";
  }
  return "区间内";
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : `${value.toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : value.toFixed(2);
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
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
