import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw, Search, X } from "lucide-react";
import { Button, DataTableFrame, EmptyState, ErrorState, LoadingState, Select } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { FundCatalogDataStateFilter, FundCatalogImportStatus, FundCatalogPageResponse, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { DirectoryTableColumns } from "./directory-table/directory-table-columns";
import { fundDirectoryTableSizing } from "./directory-table/directory-table-sizing.config";
import { DirectorySortableHeader } from "./directory-table/directory-sortable-header";
import { FundDirectoryRankingSummary } from "./directory-ranking-summary/fund-directory-ranking-summary";
import { FundDirectoryRow } from "./fund-directory-row";
import "./fund-directory-section.css";

type FundDirectorySectionProps = {
  data: FundCatalogPageResponse | null;
  error: string | null;
  isLoading: boolean;
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  dataState: FundCatalogDataStateFilter;
  sort: FundCatalogSortKey;
  order: SortOrder;
  page: number;
  limit: number;
  message: string | null;
  importingCode: string | null;
  isCatalogSyncing: boolean;
  onKeywordChange(value: string): void;
  onFundTypeChange(value: string): void;
  onDataStateChange(value: FundCatalogDataStateFilter): void;
  onStatusChange(value: FundCatalogImportStatus): void;
  onSortChange(value: FundCatalogSortKey, order?: SortOrder): void;
  onPageChange(value: number): void;
  onImport(code: string): void;
  onSyncCatalog(): void;
  onSelectAsset(assetId: string): void;
};

const fundDirectorySortOptions: ControlOption[] = [
  { value: "relevance", label: "相关度" },
  { value: "return_1d", label: "1D 涨幅" },
  { value: "return_1w", label: "1W 涨幅" },
  { value: "return_1m", label: "1M 涨幅" },
  { value: "return_3m", label: "3M 涨幅" },
  { value: "return_6m", label: "6M 涨幅" },
  { value: "return_1y", label: "1Y 涨幅" },
  { value: "latest_nav", label: "最新净值" },
  { value: "data_point_count", label: "数据点" },
  { value: "name", label: "名称" },
  { value: "code", label: "代码" }
];

const fundDirectoryOrderOptions: ControlOption[] = [
  { value: "desc", label: "降序" },
  { value: "asc", label: "升序" }
];

export function FundDirectorySection({
  data,
  error,
  isLoading,
  keyword,
  fundType,
  status,
  dataState,
  sort,
  order,
  page,
  limit,
  message,
  importingCode,
  isCatalogSyncing,
  onKeywordChange,
  onFundTypeChange,
  onDataStateChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onImport,
  onSyncCatalog,
  onSelectAsset
}: FundDirectorySectionProps): JSX.Element {
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const toIndex = Math.min(page * limit, totalCount);
  const fundTypeOptions = useMemo<ControlOption[]>(() => createFundTypeOptions(data, fundType), [data, fundType]);
  const dataStateOptions = useMemo<ControlOption[]>(() => createDataStateOptions(data), [data]);
  const statusOptions = useMemo<ControlOption[]>(() => createStatusOptions(data), [data]);
  const isInitialLoading = isLoading && !data;
  const isUpdating = isLoading && Boolean(data);

  useEffect(() => {
    setDraftKeyword(keyword);
  }, [keyword]);

  return (
    <section className="single-view-section fund-directory-section">
      <div className="fund-directory-hero">
        <div>
          <h2>基金目录</h2>
          <p>轻量目录覆盖尽量全的基金，未加入走势池也展示目录快照收益；加入后才拉取完整净值历史、计算 MACD 并进入图表墙。</p>
        </div>
        <div className="fund-directory-hero__metrics">
          <span>目录 {data?.catalog.totalCount.toLocaleString("en-US") ?? "--"}</span>
          <span>走势池 {data?.importedTotalCount.toLocaleString("en-US") ?? "--"}</span>
          <span>同步 {formatDateTime(data?.catalog.syncedAt ?? null)}</span>
          <span>快照 {formatDateTime(data?.catalog.metricSyncedAt ?? null)}</span>
        </div>
      </div>

      <div className="fund-directory-workbench">
        <form
          className="fund-directory-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            onKeywordChange(draftKeyword.trim());
          }}
        >
          <label className="search-control" htmlFor="fund-directory-search">
            <Search size={17} aria-hidden="true" />
            <input id="fund-directory-search" value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} placeholder="搜索基金代码、名称、拼音、类型" />
            {draftKeyword.length > 0 && (
              <button type="button" onClick={() => setDraftKeyword("")} aria-label="清空输入">
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </label>
          <Button type="submit" variant="secondary">
            <Search size={15} aria-hidden="true" />
            搜索
          </Button>
          {keyword.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => onKeywordChange("")}>
              清空
            </Button>
          )}
          <Select id="fund-directory-type" label="类型" value={fundType} options={fundTypeOptions} onChange={onFundTypeChange} />
          <Select id="fund-directory-data-state" label="数据" value={dataState} options={dataStateOptions} onChange={(value) => onDataStateChange(getFundCatalogDataState(value))} />
          <Select id="fund-directory-status" label="状态" value={status} options={statusOptions} onChange={(value) => onStatusChange(getImportStatus(value))} />
          <Select
            id="fund-directory-sort"
            label="排序"
            value={sort}
            options={fundDirectorySortOptions}
            onChange={(value) => {
              const nextSort = getFundCatalogSort(value);
              onSortChange(nextSort, nextSort === sort ? order : getDefaultFundCatalogOrder(nextSort));
            }}
          />
          <Select id="fund-directory-order" label="方向" value={order} options={fundDirectoryOrderOptions} onChange={(value) => onSortChange(sort, getFundCatalogOrder(value))} />
          <Button type="button" variant="ghost" disabled={isCatalogSyncing} onClick={onSyncCatalog}>
            <RefreshCcw size={15} aria-hidden="true" />
            {isCatalogSyncing ? "同步中" : "同步目录"}
          </Button>
        </form>

        {message && <p className="fund-directory-message">{message}</p>}

        {data && (
          <div className="fund-directory-result-bar">
            <span>当前筛选 {totalCount.toLocaleString("en-US")} 只</span>
            <span>{fromIndex.toLocaleString("en-US")}-{toIndex.toLocaleString("en-US")}</span>
            <span>第 {page.toLocaleString("en-US")} / {totalPages.toLocaleString("en-US")} 页</span>
            <span>排序 {fundCatalogSortLabel(sort)} {order === "desc" ? "降序" : "升序"}</span>
            {isUpdating && <span>更新中</span>}
          </div>
        )}
      </div>

      {isInitialLoading && <LoadingState />}
      {error && !data && <ErrorState title="基金目录加载失败" message={error} />}
      {isUpdating && (
        <div className="query-status query-status--info" role="status">
          <strong>目录更新中</strong>
          <span>当前先保留上一页结果</span>
        </div>
      )}
      {error && data && (
        <div className="query-status query-status--error" role="status">
          <strong>目录更新失败</strong>
          <span>{error}</span>
        </div>
      )}
      {data && (
        <>
          <FundDirectoryRankingSummary items={data.items} totalCount={data.totalCount} sort={sort} order={order} />
          {data.items.length === 0 ? (
            <EmptyState title="没有匹配基金" description="换一个关键词、类型或入库状态试试。" />
          ) : (
            <DataTableFrame
              rowCount={data.items.length}
              className="directory-table-wrapper fund-directory-table-wrapper"
              minWidth={fundDirectoryTableSizing.tableMinWidth}
              firstColumnMinWidth={fundDirectoryTableSizing.firstColumnMinWidth}
              lastColumnMinWidth={fundDirectoryTableSizing.lastColumnMinWidth}
            >
              <DirectoryTableColumns returnColumnCount={6} />
              <thead>
                <tr>
                  <DirectorySortableHeader label="基金" sortValue="name" currentSort={sort} order={order} onSort={onSortChange} />
                  <th>类型</th>
                  <th>状态</th>
                  <DirectorySortableHeader label="最新净值" sortValue="latest_nav" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="1D" sortValue="return_1d" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="1W" sortValue="return_1w" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="1M" sortValue="return_1m" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="3M" sortValue="return_3m" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="6M" sortValue="return_6m" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="1Y" sortValue="return_1y" currentSort={sort} order={order} onSort={onSortChange} />
                  <DirectorySortableHeader label="数据" sortValue="data_point_count" currentSort={sort} order={order} onSort={onSortChange} />
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <FundDirectoryRow key={item.code} item={item} importingCode={importingCode} sort={sort} onImport={onImport} onSelectAsset={onSelectAsset} />
                ))}
              </tbody>
            </DataTableFrame>
          )}

          <div className="fund-directory-pagination">
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
        </>
      )}
    </section>
  );
}

function createFundTypeOptions(data: FundCatalogPageResponse | null, currentValue: string): ControlOption[] {
  const options = data?.fundTypes.map((facet) => ({ value: facet.value, label: facet.label, count: facet.count })) ?? [];
  const optionValues = new Set(options.map((option) => option.value));

  if (currentValue !== "all" && !optionValues.has(currentValue)) {
    options.unshift({ value: currentValue, label: currentValue, count: 0 });
  }

  return [
    { value: "all", label: "全部类型", count: options.reduce((sum, option) => sum + (option.count ?? 0), 0) || data?.totalCount },
    ...options
  ];
}

function createStatusOptions(data: FundCatalogPageResponse | null): ControlOption[] {
  const fallback: ControlOption[] = [
    { value: "all", label: "全部状态" },
    { value: "imported", label: "已加入走势池" },
    { value: "not_imported", label: "待加入走势池" }
  ];
  const labels: Record<FundCatalogImportStatus, string> = {
    all: "全部状态",
    imported: "已加入走势池",
    not_imported: "待加入走势池"
  };

  return data
    ? data.statusFacets.map((facet) => ({
        value: facet.value,
        label: labels[facet.value],
        count: facet.count
      }))
    : fallback;
}

function createDataStateOptions(data: FundCatalogPageResponse | null): ControlOption[] {
  const fallback: ControlOption[] = [
    { value: "all", label: "全部数据" },
    { value: "full_history", label: "完整走势" },
    { value: "snapshot", label: "目录快照" },
    { value: "missing", label: "待拉取" },
    { value: "stale", label: "待更新" }
  ];

  return data
    ? data.dataStateFacets.map((facet) => ({
        value: facet.value,
        label: facet.label,
        count: facet.count
      }))
    : fallback;
}

function getImportStatus(value: string): FundCatalogImportStatus {
  return value === "imported" || value === "not_imported" ? value : "all";
}

function getFundCatalogDataState(value: string): FundCatalogDataStateFilter {
  const supported: FundCatalogDataStateFilter[] = ["all", "full_history", "snapshot", "missing", "stale"];
  return supported.includes(value as FundCatalogDataStateFilter) ? (value as FundCatalogDataStateFilter) : "all";
}

function getFundCatalogSort(value: string): FundCatalogSortKey {
  const supported: FundCatalogSortKey[] = ["relevance", "code", "name", "latest_nav", "return_1d", "return_1w", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];
  return supported.includes(value as FundCatalogSortKey) ? (value as FundCatalogSortKey) : "relevance";
}

function getFundCatalogOrder(value: string): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function getDefaultFundCatalogOrder(sort: FundCatalogSortKey): SortOrder {
  return sort === "code" || sort === "name" ? "asc" : "desc";
}

function fundCatalogSortLabel(sort: FundCatalogSortKey): string {
  const labels: Record<FundCatalogSortKey, string> = {
    relevance: "相关度",
    code: "代码",
    name: "名称",
    latest_nav: "最新净值",
    return_1d: "1D",
    return_1w: "1W",
    return_1m: "1M",
    return_3m: "3M",
    return_6m: "6M",
    return_1y: "1Y",
    data_point_count: "数据点"
  };
  return labels[sort];
}
