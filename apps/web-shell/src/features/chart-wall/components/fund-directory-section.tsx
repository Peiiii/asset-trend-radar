import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCcw, Search } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, Select, useTableScrollShadows } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { FundCatalogImportStatus, FundCatalogPageItem, FundCatalogPageResponse, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import "./fund-directory-section.css";

type FundDirectorySectionProps = {
  data: FundCatalogPageResponse | null;
  error: string | null;
  isLoading: boolean;
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  sort: FundCatalogSortKey;
  order: SortOrder;
  page: number;
  limit: number;
  message: string | null;
  importingCode: string | null;
  isCatalogSyncing: boolean;
  onKeywordChange(value: string): void;
  onFundTypeChange(value: string): void;
  onStatusChange(value: FundCatalogImportStatus): void;
  onSortChange(value: FundCatalogSortKey): void;
  onPageChange(value: number): void;
  onImport(code: string): void;
  onSyncCatalog(): void;
  onSelectAsset(assetId: string): void;
};

export function FundDirectorySection({
  data,
  error,
  isLoading,
  keyword,
  fundType,
  status,
  sort,
  order,
  page,
  limit,
  message,
  importingCode,
  isCatalogSyncing,
  onKeywordChange,
  onFundTypeChange,
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
  const statusOptions = useMemo<ControlOption[]>(() => createStatusOptions(data), [data]);
  const tableScroll = useTableScrollShadows(data?.items.length ?? 0);

  useEffect(() => {
    setDraftKeyword(keyword);
  }, [keyword]);

  const tableWrapperClassName = [
    "fund-directory-table-wrapper",
    tableScroll.canScrollLeft ? "fund-directory-table-wrapper--left-shadow" : "",
    tableScroll.canScrollRight ? "fund-directory-table-wrapper--right-shadow" : ""
  ].filter(Boolean).join(" ");

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
        <Select id="fund-directory-status" label="状态" value={status} options={statusOptions} onChange={(value) => onStatusChange(getImportStatus(value))} />
        <Button type="button" variant="ghost" disabled={isCatalogSyncing} onClick={onSyncCatalog}>
          <RefreshCcw size={15} aria-hidden="true" />
          {isCatalogSyncing ? "同步中" : "同步目录"}
        </Button>
      </form>

      {message && <p className="fund-directory-message">{message}</p>}

      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorState title="基金目录加载失败" message={error} />}
      {!isLoading && !error && data && (
        <>
          <div className="fund-directory-result-bar">
            <span>当前筛选 {totalCount.toLocaleString("en-US")} 只</span>
            <span>{fromIndex.toLocaleString("en-US")}-{toIndex.toLocaleString("en-US")}</span>
            <span>第 {page.toLocaleString("en-US")} / {totalPages.toLocaleString("en-US")} 页</span>
            <span>排序 {fundCatalogSortLabel(sort)} {order === "desc" ? "降序" : "升序"}</span>
          </div>

          {data.items.length === 0 ? (
            <EmptyState title="没有匹配基金" description="换一个关键词、类型或入库状态试试。" />
          ) : (
            <div ref={tableScroll.tableWrapperRef} className={tableWrapperClassName} onScroll={tableScroll.updateScrollEdges}>
              <table>
                <thead>
                  <tr>
                    <SortableFundHeader label="基金" sortValue="name" currentSort={sort} order={order} onSort={onSortChange} />
                    <th>类型</th>
                    <th>状态</th>
                    <SortableFundHeader label="最新净值" sortValue="latest_nav" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="1D" sortValue="return_1d" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="1M" sortValue="return_1m" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="3M" sortValue="return_3m" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="6M" sortValue="return_6m" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="1Y" sortValue="return_1y" currentSort={sort} order={order} onSort={onSortChange} />
                    <SortableFundHeader label="数据点" sortValue="data_point_count" currentSort={sort} order={order} onSort={onSortChange} />
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <FundDirectoryRow key={item.code} item={item} importingCode={importingCode} onImport={onImport} onSelectAsset={onSelectAsset} />
                  ))}
                </tbody>
              </table>
            </div>
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

function FundDirectoryRow({ item, importingCode, onImport, onSelectAsset }: { item: FundCatalogPageItem; importingCode: string | null; onImport(code: string): void; onSelectAsset(assetId: string): void }): JSX.Element {
  const isImporting = importingCode === item.code;

  return (
    <tr>
      <td>
        <strong>{item.name}</strong>
        <small>{item.code}{item.pinyin ? ` / ${item.pinyin}` : ""}</small>
      </td>
      <td>{item.fundType ?? "未分类"}</td>
      <td>
        <span className={item.isImported ? "fund-directory-status fund-directory-status--imported" : "fund-directory-status"}>
          {item.isImported ? "已加入走势池" : "待加入走势池"}
        </span>
      </td>
      <td>
        {item.latestNav === null ? (
          <span className="fund-directory-null">暂无快照</span>
        ) : (
          <span className="fund-directory-nav">
            <strong>{item.latestNav.toFixed(4)}</strong>
            <small>{item.latestNavDate ?? "--"}</small>
          </span>
        )}
      </td>
      <FundPercentCell value={item.return1d} />
      <FundPercentCell value={item.return1m} />
      <FundPercentCell value={item.return3m} />
      <FundPercentCell value={item.return6m} />
      <FundPercentCell value={item.return1y} />
      <td>
        {item.dataPointCount > 0 ? (
          <span className="fund-directory-source fund-directory-source--local">{item.dataPointCount.toLocaleString("en-US")} 点</span>
        ) : item.metricSource === "catalog_snapshot" ? (
          <span className="fund-directory-source fund-directory-source--snapshot">目录快照</span>
        ) : (
          <span className="fund-directory-source">待拉取</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          <button type="button" disabled={isImporting} onClick={() => onImport(item.code)}>
            {item.isImported ? <RefreshCcw size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
            {isImporting ? "处理中" : item.isImported ? "更新净值" : "加入走势池"}
          </button>
          {item.assetId && (
            <button type="button" onClick={() => onSelectAsset(item.assetId ?? "")}>
              <ExternalLink size={13} aria-hidden="true" />
              查看走势
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function FundPercentCell({ value }: { value: number | null }): JSX.Element {
  const tone = value === null ? "neutral" : value >= 0 ? "positive" : "negative";
  const strength = value === null ? "neutral" : Math.abs(value) >= 10 ? "strong" : Math.abs(value) >= 3 ? "medium" : "soft";
  return (
    <td>
      <span className={`fund-return-pill fund-return-pill--${tone} fund-return-pill--${strength}`}>{formatPercent(value)}</span>
    </td>
  );
}

function SortableFundHeader({ label, sortValue, currentSort, order, onSort }: { label: string; sortValue: FundCatalogSortKey; currentSort: FundCatalogSortKey; order: SortOrder; onSort(value: FundCatalogSortKey): void }): JSX.Element {
  const isActive = currentSort === sortValue;

  return (
    <th>
      <button type="button" className={isActive ? "fund-directory-sort fund-directory-sort--active" : "fund-directory-sort"} onClick={() => onSort(sortValue)}>
        {label}
        {isActive && (order === "desc" ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />)}
      </button>
    </th>
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

function getImportStatus(value: string): FundCatalogImportStatus {
  return value === "imported" || value === "not_imported" ? value : "all";
}

function formatPercent(value: number | null): string {
  return value === null ? "暂无快照" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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
