import { GitCompare, Plus } from "lucide-react";
import { DataTableFrame, SignalBadge } from "@gold-insights/ui";
import type { AssetDirectoryItem, AssetDirectorySortKey, AssetDirectorySortOrder } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";
import { DirectoryReturnCell, getDirectoryActiveSortCellClassName } from "../directory-table/directory-return-pill";
import { DirectoryActionButton, DirectoryRowActions } from "../directory-table/directory-row-actions";
import { DirectoryTableColumns } from "../directory-table/directory-table-columns";
import { DirectorySortableHeader } from "../directory-table/directory-sortable-header";
import { DirectoryValuationCell } from "../directory-table/directory-valuation-cell";

type AssetDirectoryTableProps = {
  items: AssetDirectoryItem[];
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
  tableMinWidth: number;
  firstColumnMinWidth: number;
  lastColumnMinWidth: number;
  canImport: boolean;
  importingItemId: string | null;
  onHeaderSort(sort: AssetDirectorySortKey): void;
  onImport(item: AssetDirectoryItem): void;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

export function AssetDirectoryTable({ items, sort, order, tableMinWidth, firstColumnMinWidth, lastColumnMinWidth, canImport, importingItemId, onHeaderSort, onImport, onSelect, onCompare }: AssetDirectoryTableProps): JSX.Element {
  return (
    <DataTableFrame rowCount={items.length} className="directory-table-wrapper asset-directory-table-wrapper" minWidth={tableMinWidth} firstColumnMinWidth={firstColumnMinWidth} lastColumnMinWidth={lastColumnMinWidth}>
      <DirectoryTableColumns includeValuationColumn />
      <thead>
        <tr>
          <DirectorySortableHeader label="资产" sortValue="label" currentSort={sort} order={order} onSort={onHeaderSort} />
          <th>类型</th>
          <th>状态</th>
          <DirectorySortableHeader label="最新价" sortValue="latest_value" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="市值/规模" sortValue="market_cap" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="1D" sortValue="return_1d" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="1M" sortValue="return_1m" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="3M" sortValue="return_3m" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="6M" sortValue="return_6m" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="1Y" sortValue="return_1y" currentSort={sort} order={order} onSort={onHeaderSort} />
          <DirectorySortableHeader label="数据" sortValue="data_point_count" currentSort={sort} order={order} onSort={onHeaderSort} />
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
              <div className="asset-directory-type-stack" title={`${assetTypeLabel(item.assetType)} / ${item.market} / ${item.exchange}`}>
                <SignalBadge label={assetTypeLabel(item.assetType)} tone="blue" />
                <small>{item.market}</small>
              </div>
            </td>
            <td><SignalBadge label={poolStateLabel(item.poolState)} tone={item.poolState === "in_pool" ? "positive" : "amber"} /></td>
            <td className={getDirectoryActiveSortCellClassName(sort === "latest_value")}>{formatPrice(item.latestValue, item.currency)}</td>
            <DirectoryValuationCell item={item} active={sort === "market_cap"} />
            <DirectoryReturnCell value={item.returns.return1d} active={sort === "return_1d"} />
            <DirectoryReturnCell value={item.returns.return1m} active={sort === "return_1m"} />
            <DirectoryReturnCell value={item.returns.return3m} active={sort === "return_3m"} />
            <DirectoryReturnCell value={item.returns.return6m} active={sort === "return_6m"} />
            <DirectoryReturnCell value={item.returns.return1y} active={sort === "return_1y"} />
            <td className={getDirectoryActiveSortCellClassName(sort === "data_point_count")}>
              <div className="asset-directory-data-stack" title={`${item.dataPointCount.toLocaleString("en-US")} 点 / ${dataStateLabel(item.dataState)} / ${item.provider}`}>
                <SignalBadge label={`${item.dataPointCount.toLocaleString("en-US")} 点`} tone="neutral" />
                <small>{dataStateLabel(item.dataState)} / {item.provider}</small>
              </div>
            </td>
            <td>
              <DirectoryRowActions>
                {canImport && item.poolState !== "in_pool" && (
                  <DirectoryActionButton
                    variant="secondary"
                    className="directory-action-button--pool"
                    icon={<Plus size={14} aria-hidden="true" />}
                    label={importingItemId === item.id ? "导入中" : "加入走势池"}
                    title={importingItemId === item.id ? `正在导入：${item.label}` : `加入走势池：${item.label}`}
                    aria-label={importingItemId === item.id ? `正在导入：${item.label}` : `加入走势池：${item.label}`}
                    disabled={importingItemId !== null}
                    onClick={() => onImport(item)}
                  />
                )}
                {item.assetId && (
                  <>
                    <DirectoryActionButton label="详情" title={`查看走势：${item.label}`} variant="ghost" onClick={() => onSelect(item.assetId ?? "")} />
                    <DirectoryActionButton label="对比" title={`加入对比：${item.label}`} variant="ghost" icon={<GitCompare size={14} aria-hidden="true" />} onClick={() => onCompare(item.assetId ?? "")} />
                  </>
                )}
              </DirectoryRowActions>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTableFrame>
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

function assetTypeLabel(value: AssetDirectoryItem["assetType"]): string {
  const labels: Record<AssetDirectoryItem["assetType"], string> = {
    crypto: "币种",
    equity: "股票",
    index: "指数",
    fund: "基金",
    commodity: "商品",
    macro: "宏观"
  };
  return labels[value];
}
