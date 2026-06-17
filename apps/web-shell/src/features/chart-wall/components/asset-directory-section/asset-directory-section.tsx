import { GitCompare, Search } from "lucide-react";
import { Button, DataTableFrame, EmptyState, SignalBadge } from "@gold-insights/ui";
import type { AssetDirectoryItem } from "@gold-insights/market-domain";
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
  search: string;
  statusLabel: string;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

export function AssetDirectorySection({ title, description, items, totalCount, categoryItemCount, categoryInPoolCount, search, statusLabel, onSelect, onCompare }: AssetDirectorySectionProps): JSX.Element {
  const positiveCount = items.filter((item) => (item.returns.return1m ?? item.returns.return1d ?? 0) > 0).length;
  const sourceCount = new Set(items.map((item) => item.provider)).size;
  const hasHiddenItems = totalCount > items.length;

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

      <div className="asset-directory-result-bar">
        <span>当前筛选 {totalCount.toLocaleString("en-US")} 个</span>
        {hasHiddenItems && <span>已显示前 {items.length.toLocaleString("en-US")} 个</span>}
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
        <DataTableFrame rowCount={items.length} className="asset-directory-table-wrapper" minWidth={1220} firstColumnMinWidth={286} lastColumnMinWidth={166}>
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
                  <button type="button" className="asset-directory-identity" disabled={!item.assetId} onClick={() => item.assetId && onSelect(item.assetId)}>
                    <strong>{item.label}</strong>
                    <small>{item.symbol} / {item.exchange}</small>
                  </button>
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
                    <Button type="button" variant="ghost" disabled={!item.assetId} onClick={() => item.assetId && onSelect(item.assetId)}>详情</Button>
                    <Button type="button" variant="ghost" disabled={!item.assetId} onClick={() => item.assetId && onCompare(item.assetId)}>
                      <GitCompare size={14} aria-hidden="true" />
                      对比
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTableFrame>
      )}
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
