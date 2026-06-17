import { ChevronLeft, ChevronRight, GitCompare, Plus, Search } from "lucide-react";
import { Button, DataTableFrame, EmptyState, Select, SignalBadge } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { AssetDirectoryItem, AssetDirectorySortKey, AssetDirectorySortOrder, AssetDirectoryStatusFilter } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";
import { DirectoryReturnPill } from "../directory-table/directory-return-pill";
import "./asset-directory-section.css";

type AssetDirectorySectionProps = {
  title: string;
  description: string;
  items: AssetDirectoryItem[];
  totalCount: number;
  categoryItemCount: number;
  categoryInPoolCount: number;
  status: AssetDirectoryStatusFilter;
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
  search: string;
  statusLabel: string;
  page: number;
  limit: number;
  tableMinWidth: number;
  firstColumnMinWidth: number;
  lastColumnMinWidth: number;
  canImport: boolean;
  importingItemId: string | null;
  message: string | null;
  onStatusChange(status: AssetDirectoryStatusFilter): void;
  onSortChange(sort: AssetDirectorySortKey, order?: AssetDirectorySortOrder): void;
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
  { value: "latest_value", label: "最新价" },
  { value: "data_point_count", label: "数据点" },
  { value: "label", label: "名称" }
];

const directoryOrderOptions: ControlOption[] = [
  { value: "desc", label: "降序" },
  { value: "asc", label: "升序" }
];

export function AssetDirectorySection({ title, description, items, totalCount, categoryItemCount, categoryInPoolCount, status, sort, order, search, statusLabel, page, limit, tableMinWidth, firstColumnMinWidth, lastColumnMinWidth, canImport, importingItemId, message, onStatusChange, onSortChange, onReset, onPageChange, onImport, onSelect, onCompare }: AssetDirectorySectionProps): JSX.Element {
  const positiveCount = items.filter((item) => (item.returns.return1m ?? item.returns.return1d ?? 0) > 0).length;
  const sourceCount = new Set(items.map((item) => item.provider)).size;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const toIndex = Math.min(page * limit, totalCount);

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

      <div className="asset-directory-toolbar">
        <Select id="asset-directory-status" label="状态" value={status} options={directoryStatusOptions} onChange={(value) => onStatusChange(getDirectoryStatus(value))} />
        <Select id="asset-directory-sort" label="排序" value={sort} options={directorySortOptions} onChange={(value) => onSortChange(getDirectorySort(value), getDefaultDirectoryOrder(value))} />
        <Select id="asset-directory-order" label="方向" value={order} options={directoryOrderOptions} onChange={(value) => onSortChange(sort, getDirectoryOrder(value))} />
        <Button type="button" variant="ghost" onClick={onReset}>重置</Button>
      </div>

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

      {items.length === 0 ? (
        <EmptyState title="没有匹配资产" description="换一个关键词或回到图表墙调整筛选条件。" />
      ) : (
        <DataTableFrame rowCount={items.length} className="asset-directory-table-wrapper" minWidth={tableMinWidth} firstColumnMinWidth={firstColumnMinWidth} lastColumnMinWidth={lastColumnMinWidth}>
          <thead>
            <tr>
              <th>资产</th>
              <th>类型</th>
              <th>状态</th>
              <th>最新价</th>
              <th>1D</th>
              <th>1M</th>
              <th>3M</th>
              <th>6M</th>
              <th>1Y</th>
              <th>数据</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="asset-directory-identity" title={`${item.label} / ${item.symbol} / ${item.exchange}`}>
                    <strong>{item.label}</strong>
                    <small>{item.symbol}</small>
                  </div>
                </td>
                <td>
                  <div className="asset-directory-type-stack">
                    <SignalBadge label={item.market} tone="blue" />
                    <small>{item.assetType}</small>
                  </div>
                </td>
                <td><SignalBadge label={poolStateLabel(item.poolState)} tone={item.poolState === "in_pool" ? "positive" : "amber"} /></td>
                <td>{formatPrice(item.latestValue, item.currency)}</td>
                <td><DirectoryReturnPill value={item.returns.return1d} /></td>
                <td><DirectoryReturnPill value={item.returns.return1m} /></td>
                <td><DirectoryReturnPill value={item.returns.return3m} /></td>
                <td><DirectoryReturnPill value={item.returns.return6m} /></td>
                <td><DirectoryReturnPill value={item.returns.return1y} /></td>
                <td>
                  <div className="asset-directory-data-stack">
                    <SignalBadge label={`${item.dataPointCount.toLocaleString("en-US")} 点`} tone="neutral" />
                    <small>{dataStateLabel(item.dataState)} / {item.provider}</small>
                  </div>
                </td>
                <td>
                  <div className="asset-directory-actions">
                    {canImport && item.poolState !== "in_pool" && (
                      <Button type="button" variant="secondary" title="加入走势池" disabled={importingItemId !== null} onClick={() => onImport(item)}>
                        <Plus size={14} aria-hidden="true" />
                        {importingItemId === item.id ? "导入中" : "加入"}
                      </Button>
                    )}
                    {item.assetId && (
                      <>
                        <Button type="button" variant="ghost" onClick={() => onSelect(item.assetId ?? "")}>详情</Button>
                        <Button type="button" variant="ghost" onClick={() => onCompare(item.assetId ?? "")}>
                          <GitCompare size={14} aria-hidden="true" />
                          对比
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTableFrame>
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

function poolStateLabel(value: AssetDirectoryItem["poolState"]): string {
  const labels: Record<AssetDirectoryItem["poolState"], string> = {
    in_pool: "已加入走势池",
    not_in_pool: "待加入走势池",
    syncing: "同步中",
    failed: "同步失败"
  };
  return labels[value];
}

function dataStateLabel(value: AssetDirectoryItem["dataState"]): string {
  const labels: Record<AssetDirectoryItem["dataState"], string> = {
    full_history: "完整走势",
    snapshot: "目录快照",
    missing: "待拉取",
    stale: "待更新"
  };
  return labels[value];
}

function getDirectoryStatus(value: string): AssetDirectoryStatusFilter {
  return value === "in_pool" || value === "not_in_pool" ? value : "all";
}

function getDirectorySort(value: string): AssetDirectorySortKey {
  const supported: AssetDirectorySortKey[] = ["label", "latest_value", "return_1d", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];
  return supported.includes(value as AssetDirectorySortKey) ? (value as AssetDirectorySortKey) : "return_1m";
}

function getDirectoryOrder(value: string): AssetDirectorySortOrder {
  return value === "asc" ? "asc" : "desc";
}

function getDefaultDirectoryOrder(sort: string): AssetDirectorySortOrder {
  return sort === "label" ? "asc" : "desc";
}
