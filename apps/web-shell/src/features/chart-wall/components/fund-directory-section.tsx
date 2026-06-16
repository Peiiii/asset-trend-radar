import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCcw, Search } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, Select } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { FundCatalogImportStatus, FundCatalogPageItem, FundCatalogPageResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import "./fund-directory-section.css";

type FundDirectorySectionProps = {
  data: FundCatalogPageResponse | null;
  error: string | null;
  isLoading: boolean;
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  page: number;
  limit: number;
  message: string | null;
  importingCode: string | null;
  isCatalogSyncing: boolean;
  onKeywordChange(value: string): void;
  onFundTypeChange(value: string): void;
  onStatusChange(value: FundCatalogImportStatus): void;
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
  page,
  limit,
  message,
  importingCode,
  isCatalogSyncing,
  onKeywordChange,
  onFundTypeChange,
  onStatusChange,
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
          </div>

          {data.items.length === 0 ? (
            <EmptyState title="没有匹配基金" description="换一个关键词、类型或入库状态试试。" />
          ) : (
            <div className="fund-directory-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>基金</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>最新净值</th>
                    <th>1D</th>
                    <th>1M</th>
                    <th>3M</th>
                    <th>6M</th>
                    <th>1Y</th>
                    <th>数据点</th>
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
      <td>{item.latestNav === null ? "暂无快照" : `${item.latestNav.toFixed(4)} / ${item.latestNavDate ?? "--"}`}</td>
      <FundPercentCell value={item.return1d} />
      <FundPercentCell value={item.return1m} />
      <FundPercentCell value={item.return3m} />
      <FundPercentCell value={item.return6m} />
      <FundPercentCell value={item.return1y} />
      <td>{item.dataPointCount > 0 ? item.dataPointCount.toLocaleString("en-US") : item.metricSource === "catalog_snapshot" ? "目录快照" : "待拉取"}</td>
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
  return <td className={`percent-cell--${tone}`}>{formatPercent(value)}</td>;
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
