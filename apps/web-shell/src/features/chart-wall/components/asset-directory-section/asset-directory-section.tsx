import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button, EmptyState, Select } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { AssetDirectoryAssetTypeFilter, AssetDirectoryDataStateFilter, AssetDirectoryItem, AssetDirectoryPageResponse, AssetDirectorySortKey, AssetDirectorySortOrder, AssetDirectoryStatusFilter, AssetDirectoryValuationStatusFilter } from "@gold-insights/market-domain";
import { DirectoryRankingSummary } from "../directory-ranking-summary/directory-ranking-summary";
import { ValuationCoverageSummary } from "../valuation-coverage-summary/valuation-coverage-summary";
import { AssetDirectoryTable } from "./asset-directory-table";
import "./asset-directory-section.css";

type AssetDirectorySectionProps = {
  title: string;
  description: string;
  items: AssetDirectoryItem[];
  totalCount: number;
  categoryItemCount: number;
  categoryInPoolCount: number;
  market: string;
  assetType: AssetDirectoryAssetTypeFilter;
  dataState: AssetDirectoryDataStateFilter;
  valuationStatus: AssetDirectoryValuationStatusFilter;
  status: AssetDirectoryStatusFilter;
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
  search: string;
  statusLabel: string;
  marketFacets: AssetDirectoryPageResponse["facets"]["markets"];
  assetTypeFacets: AssetDirectoryPageResponse["facets"]["assetTypes"];
  dataStateFacets: AssetDirectoryPageResponse["facets"]["dataStates"];
  valuationStatusFacets: AssetDirectoryPageResponse["facets"]["valuationStatuses"];
  statusFacets: AssetDirectoryPageResponse["facets"]["statuses"];
  page: number;
  limit: number;
  tableMinWidth: number;
  firstColumnMinWidth: number;
  lastColumnMinWidth: number;
  canImport: boolean;
  importingItemId: string | null;
  message: string | null;
  onMarketChange(market: string): void;
  onAssetTypeChange(assetType: AssetDirectoryAssetTypeFilter): void;
  onDataStateChange(dataState: AssetDirectoryDataStateFilter): void;
  onValuationStatusChange(valuationStatus: AssetDirectoryValuationStatusFilter): void;
  onStatusChange(status: AssetDirectoryStatusFilter): void;
  onSortChange(sort: AssetDirectorySortKey, order?: AssetDirectorySortOrder): void;
  onSearchChange(search: string): void;
  onReset(): void;
  onPageChange(page: number): void;
  onImport(item: AssetDirectoryItem): void;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

const directoryStatusOptions: ControlOption[] = [
  { value: "all", label: "全部状态" },
  { value: "in_pool", label: "已加入走势池" },
  { value: "not_in_pool", label: "待加入走势池" }
];

const directorySortOptions: ControlOption[] = [
  { value: "return_1d", label: "1D 涨幅" },
  { value: "return_1m", label: "1M 涨幅" },
  { value: "return_3m", label: "3M 涨幅" },
  { value: "return_6m", label: "6M 涨幅" },
  { value: "return_1y", label: "1Y 涨幅" },
  { value: "market_cap", label: "市值" },
  { value: "latest_value", label: "最新价" },
  { value: "data_point_count", label: "数据点" },
  { value: "label", label: "名称" }
];

const directoryOrderOptions: ControlOption[] = [
  { value: "desc", label: "降序" },
  { value: "asc", label: "升序" }
];

export function AssetDirectorySection({ title, description, items, totalCount, categoryItemCount, categoryInPoolCount, market, assetType, dataState, valuationStatus, status, sort, order, search, statusLabel, marketFacets, assetTypeFacets, dataStateFacets, valuationStatusFacets, statusFacets, page, limit, tableMinWidth, firstColumnMinWidth, lastColumnMinWidth, canImport, importingItemId, message, onMarketChange, onAssetTypeChange, onDataStateChange, onValuationStatusChange, onStatusChange, onSortChange, onSearchChange, onReset, onPageChange, onImport, onSelect, onCompare }: AssetDirectorySectionProps): JSX.Element {
  const [draftSearch, setDraftSearch] = useState(search);
  const positiveCount = items.filter((item) => (item.returns.return1m ?? item.returns.return1d ?? 0) > 0).length;
  const sourceCount = new Set(items.map((item) => item.provider)).size;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const toIndex = Math.min(page * limit, totalCount);
  const marketOptions = getDirectoryFacetOptions("全部市场", marketFacets, market);
  const assetTypeOptions = getDirectoryFacetOptions("全部品种", assetTypeFacets, assetType);
  const dataStateOptions = getDirectoryDataStateOptions(dataStateFacets);
  const valuationStatusOptions = getDirectoryValuationStatusOptions(valuationStatusFacets);
  const statusOptions = getDirectoryStatusOptions(statusFacets);
  const handleHeaderSort = (nextSort: AssetDirectorySortKey): void => {
    onSortChange(nextSort, nextSort === sort ? toggleDirectoryOrder(order) : getDefaultDirectoryOrder(nextSort));
  };

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  return (
    <section className="single-view-section asset-directory-section">
      <div className="asset-directory-hero">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="asset-directory-hero__metrics">
          <span>目录 {categoryItemCount.toLocaleString("en-US")}</span>
          <span>本页上涨 {positiveCount.toLocaleString("en-US")}</span>
          <span>走势池 {categoryInPoolCount.toLocaleString("en-US")}</span>
          <span>本页来源 {sourceCount.toLocaleString("en-US")}</span>
        </div>
      </div>

      <div className="asset-directory-workbench">
        <form
          className="asset-directory-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchChange(draftSearch.trim());
          }}
        >
          <label className="search-control" htmlFor="asset-directory-search">
            <Search size={17} aria-hidden="true" />
            <input id="asset-directory-search" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="搜索名称、代码、交易所、来源" />
            {draftSearch.length > 0 && (
              <button type="button" onClick={() => setDraftSearch("")} aria-label="清空输入">
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </label>
          <Button type="submit" variant="secondary">
            <Search size={15} aria-hidden="true" />
            搜索
          </Button>
          {search.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => onSearchChange("")}>
              清空
            </Button>
          )}
          <Select id="asset-directory-market" label="市场" value={market} options={marketOptions} onChange={onMarketChange} />
          <Select id="asset-directory-asset-type" label="品种" value={assetType} options={assetTypeOptions} onChange={(value) => onAssetTypeChange(getDirectoryAssetType(value))} />
          <Select id="asset-directory-data-state" label="数据" value={dataState} options={dataStateOptions} onChange={(value) => onDataStateChange(getDirectoryDataState(value))} />
          <Select id="asset-directory-valuation-status" label="规模" value={valuationStatus} options={valuationStatusOptions} onChange={(value) => onValuationStatusChange(getDirectoryValuationStatus(value))} />
          <Select id="asset-directory-status" label="状态" value={status} options={statusOptions} onChange={(value) => onStatusChange(getDirectoryStatus(value))} />
          <Select id="asset-directory-sort" label="排序" value={sort} options={directorySortOptions} onChange={(value) => onSortChange(getDirectorySort(value), getDefaultDirectoryOrder(value))} />
          <Select id="asset-directory-order" label="方向" value={order} options={directoryOrderOptions} onChange={(value) => onSortChange(sort, getDirectoryOrder(value))} />
          <Button type="button" variant="ghost" onClick={onReset}>重置</Button>
        </form>

        {message && <p className="asset-directory-message">{message}</p>}

        <div className="asset-directory-result-bar">
          <span>当前筛选 {totalCount.toLocaleString("en-US")} 个</span>
          <span>{fromIndex.toLocaleString("en-US")}-{toIndex.toLocaleString("en-US")}</span>
          <span>第 {page.toLocaleString("en-US")} / {totalPages.toLocaleString("en-US")} 页</span>
          {search.trim().length > 0 && (
            <span>
              <Search size={13} aria-hidden="true" />
              {search.trim()}
            </span>
          )}
          <span>{statusLabel}</span>
        </div>
      </div>

      <DirectoryRankingSummary items={items} totalCount={totalCount} sort={sort} order={order} />
      {items.length > 0 && (
        <ValuationCoverageSummary
          items={items}
          title="本页市值覆盖"
          description="按当前页统计可排序市值、源未返回、未接入源和不适用；这些空态不是后台加载中。"
          variant="compact"
        />
      )}

      {items.length === 0 ? (
        <EmptyState title="没有匹配资产" description="换一个关键词或回到图表墙调整筛选条件。" />
      ) : (
        <AssetDirectoryTable
          items={items}
          sort={sort}
          order={order}
          tableMinWidth={tableMinWidth}
          firstColumnMinWidth={firstColumnMinWidth}
          lastColumnMinWidth={lastColumnMinWidth}
          canImport={canImport}
          importingItemId={importingItemId}
          onHeaderSort={handleHeaderSort}
          onImport={onImport}
          onSelect={onSelect}
          onCompare={onCompare}
        />
      )}

      <div className="asset-directory-pagination">
        <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={15} aria-hidden="true" />
          上一页
        </Button>
        <span>{fromIndex.toLocaleString("en-US")}-{toIndex.toLocaleString("en-US")} / {totalCount.toLocaleString("en-US")}</span>
        <Button type="button" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          下一页
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

function getDirectoryStatus(value: string): AssetDirectoryStatusFilter {
  return value === "in_pool" || value === "not_in_pool" ? value : "all";
}

function getDirectoryAssetType(value: string): AssetDirectoryAssetTypeFilter {
  const supported: AssetDirectoryAssetTypeFilter[] = ["all", "crypto", "equity", "index", "fund", "commodity", "macro"];
  return supported.includes(value as AssetDirectoryAssetTypeFilter) ? (value as AssetDirectoryAssetTypeFilter) : "all";
}

function getDirectoryDataState(value: string): AssetDirectoryDataStateFilter {
  const supported: AssetDirectoryDataStateFilter[] = ["all", "full_history", "snapshot", "missing", "stale"];
  return supported.includes(value as AssetDirectoryDataStateFilter) ? (value as AssetDirectoryDataStateFilter) : "all";
}

function getDirectoryValuationStatus(value: string): AssetDirectoryValuationStatusFilter {
  const supported: AssetDirectoryValuationStatusFilter[] = ["all", "available", "turnover_only", "source_missing_value", "source_unavailable", "not_applicable"];
  return supported.includes(value as AssetDirectoryValuationStatusFilter) ? (value as AssetDirectoryValuationStatusFilter) : "all";
}

function getDirectoryFacetOptions(allLabel: string, facets: AssetDirectoryPageResponse["facets"]["markets"], selectedValue: string): ControlOption[] {
  const options: ControlOption[] = [
    { value: "all", label: allLabel, count: facets.reduce((total, facet) => total + facet.count, 0) },
    ...facets.map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }))
  ];

  if (selectedValue !== "all" && !options.some((option) => option.value === selectedValue)) {
    options.push({ value: selectedValue, label: selectedValue, count: 0 });
  }

  return options;
}

function getDirectoryDataStateOptions(dataStateFacets: AssetDirectoryPageResponse["facets"]["dataStates"]): ControlOption[] {
  return dataStateFacets.map((facet) => ({
    value: facet.value,
    label: facet.label,
    count: facet.count
  }));
}

function getDirectoryValuationStatusOptions(valuationStatusFacets: AssetDirectoryPageResponse["facets"]["valuationStatuses"]): ControlOption[] {
  return valuationStatusFacets.map((facet) => ({
    value: facet.value,
    label: facet.label,
    count: facet.count
  }));
}

function getDirectoryStatusOptions(statusFacets: AssetDirectoryPageResponse["facets"]["statuses"]): ControlOption[] {
  const counts = new Map(statusFacets.map((facet) => [facet.value, facet.count]));
  return directoryStatusOptions.map((option) => ({
    ...option,
    count: counts.get(getDirectoryStatus(option.value))
  }));
}

function getDirectorySort(value: string): AssetDirectorySortKey {
  const supported: AssetDirectorySortKey[] = ["label", "latest_value", "market_cap", "return_1d", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];
  return supported.includes(value as AssetDirectorySortKey) ? (value as AssetDirectorySortKey) : "return_1m";
}

function getDirectoryOrder(value: string): AssetDirectorySortOrder {
  return value === "asc" ? "asc" : "desc";
}

function toggleDirectoryOrder(value: AssetDirectorySortOrder): AssetDirectorySortOrder {
  return value === "desc" ? "asc" : "desc";
}

function getDefaultDirectoryOrder(sort: string): AssetDirectorySortOrder {
  return sort === "label" ? "asc" : "desc";
}
