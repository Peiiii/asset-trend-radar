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
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, Button, ErrorState, IconButton, LoadingState, RangePicker, TimeframePicker } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ChartWallSortOrder } from "@gold-insights/market-domain";
import type { ChartWallFilters, ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { assetTypeFallbackOptions, defaultFilters, levelFallbackOptions, marketFallbackOptions, signalFallbackOptions, sortOptions, sortOrderOptions, tagFallbackOptions } from "../configs/chart-wall-page.config";
import { ActiveFilterChips } from "./active-filter-chips/active-filter-chips";
import { AssetDetailSection } from "./asset-detail-section/asset-detail-section";
import { AssetDirectorySection } from "./asset-directory-section/asset-directory-section";
import { ChartGrid } from "./chart-grid/chart-grid";
import { ComparePanel } from "./compare-panel/compare-panel";
import { ChartWallControls, type ChartWallViewMode } from "./chart-wall-controls/chart-wall-controls";
import { DataHealthSection } from "./data-health-section/data-health-section";
import { ExchangeTable } from "./exchange-table/exchange-table";
import { FundDirectorySection } from "./fund-directory-section";
import "./market-chart-primitives.css";
import { OverviewSection } from "./overview-section/overview-section";
import { ScannerSection } from "./scanner-section/scanner-section";
import { StrategyPresetStrip, type StrategyPresetFilters } from "./strategy-preset-strip/strategy-preset-strip";
import { TaskActivityNotice } from "./task-center/task-activity-notice";
import { TaskCenterSection } from "./task-center/task-center-section";
import { TaskStatusButton } from "./task-center/task-status-button";
import { UniverseSection } from "./universe-section/universe-section";
import { WatchlistSection } from "./watchlist-section/watchlist-section";
import { chartWallApiService } from "../services/chart-wall-api.service";
import { useFundDirectoryQuery } from "../hooks/use-fund-directory-query";
import { useAssetDetailQuery } from "../hooks/use-asset-detail-query";
import { useChartWallQuery } from "../hooks/use-chart-wall-query";
import { useCompareSelection } from "../hooks/use-compare-selection";
import { useFundDirectoryUrlState } from "../hooks/use-fund-directory-url-state";
import { useTaskActions } from "../hooks/use-task-actions";
import { useTaskCenterQuery } from "../hooks/use-task-center-query";

type ActiveView = "overview" | "chart-wall" | "fund-directory" | "crypto-directory" | "universe" | "scanner" | "asset-detail" | "watchlist" | "tasks" | "data-health";

const viewTitles: Record<ActiveView, string> = {
  overview: "全市场概览",
  "chart-wall": "全市场图表墙",
  "fund-directory": "基金目录",
  "crypto-directory": "加密货币目录",
  universe: "资产宇宙",
  scanner: "机会扫描",
  "asset-detail": "资产详情",
  watchlist: "自选图表墙",
  tasks: "任务中心",
  "data-health": "数据源与任务状态"
};

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
  const tag = getSearchValue(searchParams, "tag", defaultFilters.tag);
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
  const compareSelection = useCompareSelection(range, timeframe);
  const [importingFundCode, setImportingFundCode] = useState<string | null>(null);
  const [fundImportMessage, setFundImportMessage] = useState<string | null>(null);
  const isAssetDirectoryView = activeView === "fund-directory" || activeView === "crypto-directory";
  const effectiveMarket = activeView === "crypto-directory" ? "加密" : market;
  const effectiveAssetType = activeView === "crypto-directory" ? "crypto" : assetType;
  const effectiveSort = activeView === "crypto-directory" && !searchParams.has("sort") ? "return_1m" : sort;
  const effectiveOrder = activeView === "crypto-directory" && !searchParams.has("order") ? "desc" : order;

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
      market: effectiveMarket,
      assetType: effectiveAssetType,
      tag,
      sort: effectiveSort,
      order: effectiveOrder,
      signal
    }),
    [effectiveAssetType, effectiveMarket, effectiveOrder, effectiveSort, level, range, signal, tag, timeframe]
  );
  const { data, error, isLoading, reload } = useChartWallQuery(filters);
  const fundDirectoryQuery = useFundDirectoryQuery(fundDirectory.filters, activeView === "fund-directory");
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

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams());
  };

  const applyStrategyPreset = (preset: StrategyPresetFilters): void => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("level");
    next.delete("tag");

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

    setSearchParams(next);
  };

  const currentSearch = getSearchWithout(searchParams, ["from"]);
  const fundDirectorySearch = getFundDirectorySearch(searchParams);
  const cryptoDirectorySearch = getCryptoDirectorySearch(searchParams);
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
            <SidebarButton active={activeView === "overview"} label="概览" title="全市场概览" to={`/overview${currentSearch}`}>
              <Gauge size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarButton active={activeView === "chart-wall"} label="图表墙" title="全市场图表墙" to={`/chart-wall${currentSearch}`}>
              <BarChart3 size={18} aria-hidden="true" />
            </SidebarButton>
            <SidebarGroup active={isAssetDirectoryView} label="资产目录" title="资产目录" icon={<FolderOpen size={18} aria-hidden="true" />}>
              <SidebarButton active={activeView === "fund-directory"} label="基金目录" title="基金目录" to={`/directories/funds${fundDirectorySearch}`} level="child">
                <BookOpen size={16} aria-hidden="true" />
              </SidebarButton>
              <SidebarButton active={activeView === "crypto-directory"} label="加密目录" title="加密货币目录" to={`/directories/crypto${cryptoDirectorySearch}`} level="child">
                <Bitcoin size={16} aria-hidden="true" />
              </SidebarButton>
            </SidebarGroup>
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
            isPolling={taskCenterQuery.isPolling}
            lastLoadedAt={taskCenterQuery.lastLoadedAt}
            pollIntervalMs={taskCenterQuery.pollIntervalMs}
            onClick={() => {
              navigate(`/tasks${currentSearch}`);
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
            navigate(`/tasks${currentSearch}`);
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
            values={{ market, assetType, level, tag, signal, sort, order, range, timeframe, viewMode }}
            defaults={defaultFilters}
            facets={data?.chartWall.facets}
            options={{ markets: marketFallbackOptions, assetTypes: assetTypeFallbackOptions, levels: levelFallbackOptions, tags: tagFallbackOptions, signals: signalFallbackOptions, sorts: sortOptions, orders: sortOrderOptions }}
            summary={{ visibleCount: filteredItems.length, apiCount: chartItems.length, sortLabel: sortDisplayLabel(sort), orderLabel: sortOrderLabel(order) }}
            isRefreshing={isGlobalSyncing}
            showViewMode={activeView === "chart-wall"}
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
            <StrategyPresetStrip currentFilters={{ market, assetType, tag, signal, sort, order, range, timeframe }} onApply={applyStrategyPreset} />
          )}

          <ActiveFilterChips
            filters={{ market, assetType, level, tag, signal, sort, order, search }}
            defaults={{ sort: defaultFilters.sort, order: defaultFilters.order }}
            options={{ assetTypes: assetTypeFallbackOptions, levels: levelFallbackOptions, tags: tagFallbackOptions, signals: signalFallbackOptions, sorts: sortOptions, orders: sortOrderOptions }}
            onRemove={removeFilterChip}
            onReset={resetFilters}
          />
        </>
      )}
      {data && activeView === "chart-wall" && assetType === "fund" && <FundScopeStrip data={data} market={market} />}

      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorState title="行情加载失败" message={error} />}

      {!isLoading && !error && data && (
        <>
          {activeView === "overview" && (
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

          {activeView === "chart-wall" && (
            <section className="chart-wall-section">
              <SectionHeader
                title="走势列表"
                description={`${rangeLabel(data.chartWall.range)} / ${timeframeLabel(data.chartWall.timeframe)} / ${sortDisplayLabel(sort)} ${sortOrderLabel(order)} / ${filteredItems.length} 个资产`}
                generatedAt={data.chartWall.generatedAt}
              />
              <ComparePanel compareData={compareSelection.compareData} compareAssetIds={compareSelection.compareAssetIds} allItems={chartItems} onRemove={compareSelection.toggleCompare} onClear={compareSelection.clearCompare} />
              {viewMode === "grid" ? (
                <ChartGrid items={filteredItems} sort={sort} order={order} onSelect={selectAsset} onPin={handlePin} onCompare={compareSelection.toggleCompare} onResetFilters={resetFilters} />
              ) : (
                <ExchangeTable items={filteredItems} sort={sort} order={order} onSort={setSortQueryValue} onSelect={selectAsset} onPin={handlePin} onCompare={compareSelection.toggleCompare} />
              )}
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

          {activeView === "crypto-directory" && (
            <AssetDirectorySection
              title="加密货币目录"
              description="当前展示真实已入库、可打开完整走势和指标的加密资产。后续接入交易所全量目录后，这里会扩展为轻量候选池，再按需加入走势池。"
              items={filteredItems}
              search={search}
              statusLabel="真实已入库 / 走势池"
              onSelect={selectAsset}
              onCompare={compareSelection.toggleCompare}
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

          {activeView === "watchlist" && (
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
  if (pathname.startsWith("/directories/crypto")) {
    return "crypto-directory";
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

  return ["/overview", "/chart-wall", "/directories/funds", "/directories/crypto", "/funds", "/universe", "/scanner", "/watchlist", "/tasks", "/data-health"].some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

function getFundDirectorySearch(searchParams: URLSearchParams): string {
  const next = new URLSearchParams();

  for (const name of ["fundKeyword", "fundType", "fundStatus", "fundSort", "fundOrder", "fundPage"]) {
    const value = searchParams.get(name);
    if (value) {
      next.set(name, value);
    }
  }

  return toSearchString(next);
}

function getCryptoDirectorySearch(searchParams: URLSearchParams): string {
  const next = new URLSearchParams();

  for (const name of ["range", "timeframe", "q"]) {
    const value = searchParams.get(name);
    if (value) {
      next.set(name, value);
    }
  }

  next.set("market", "加密");
  next.set("assetType", "crypto");
  next.set("sort", "return_1m");
  next.set("order", "desc");

  return toSearchString(next);
}

function toSearchString(searchParams: URLSearchParams): string {
  const value = searchParams.toString();
  return value.length > 0 ? `?${value}` : "";
}

function getSearchValue(searchParams: URLSearchParams, name: string, fallback: string): string {
  return searchParams.get(name) ?? fallback;
}

function getViewMode(value: string): ChartWallViewMode {
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
