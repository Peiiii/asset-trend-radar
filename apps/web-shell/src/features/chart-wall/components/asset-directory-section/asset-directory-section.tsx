import { GitCompare, Search } from "lucide-react";
import { Button, DataTableFrame, EmptyState, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";
import { DirectoryReturnPill } from "../directory-table/directory-return-pill";
import "./asset-directory-section.css";

type AssetDirectorySectionProps = {
  title: string;
  description: string;
  items: ChartWallItem[];
  search: string;
  statusLabel: string;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

export function AssetDirectorySection({ title, description, items, search, statusLabel, onSelect, onCompare }: AssetDirectorySectionProps): JSX.Element {
  const eventfulCount = items.filter((item) => item.events.length > 0).length;
  const positiveCount = items.filter((item) => (item.return1m ?? item.returnPct ?? 0) > 0).length;
  const sourceCount = new Set(items.map((item) => item.source)).size;

  return (
    <section className="single-view-section asset-directory-section">
      <div className="asset-directory-hero">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="asset-directory-hero__metrics">
          <span>目录 {items.length.toLocaleString("en-US")}</span>
          <span>上涨 {positiveCount.toLocaleString("en-US")}</span>
          <span>有事件 {eventfulCount.toLocaleString("en-US")}</span>
          <span>来源 {sourceCount.toLocaleString("en-US")}</span>
        </div>
      </div>

      <div className="asset-directory-result-bar">
        <span>当前筛选 {items.length.toLocaleString("en-US")} 个</span>
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
                  <button type="button" className="asset-directory-identity" onClick={() => onSelect(item.id)}>
                    <strong>{item.name}</strong>
                    <small>{item.symbol} / {item.exchange}</small>
                  </button>
                </td>
                <td>
                  <div className="asset-directory-type-stack">
                    <SignalBadge label={item.market} tone="blue" />
                    <small>{item.assetType}</small>
                  </div>
                </td>
                <td><SignalBadge label="已加入走势池" tone="positive" /></td>
                <td>{formatPrice(item.lastPrice, item.currency)}</td>
                <td><DirectoryReturnPill value={item.return1d} /></td>
                <td><DirectoryReturnPill value={item.return1m} /></td>
                <td><DirectoryReturnPill value={item.return3m} /></td>
                <td><DirectoryReturnPill value={item.return6m} /></td>
                <td><DirectoryReturnPill value={item.return1y} /></td>
                <td>
                  <div className="asset-directory-data-stack">
                    <SignalBadge label={`${item.dataPointCount.toLocaleString("en-US")} 点`} tone="neutral" />
                    <small>{item.trendScore} / {item.trendLabel} / {item.events.length} 事件</small>
                  </div>
                </td>
                <td>
                  <div className="asset-directory-actions">
                    <Button type="button" variant="ghost" onClick={() => onSelect(item.id)}>详情</Button>
                    <Button type="button" variant="ghost" onClick={() => onCompare(item.id)}>
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
