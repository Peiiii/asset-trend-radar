import { Button, EmptyState } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { AssetChartCard } from "../asset-chart-card";
import { RankingQualitySummary } from "../ranking-quality-summary/ranking-quality-summary";
import "./chart-grid.css";

type ChartGridProps = {
  items: ChartWallItem[];
  sort?: string;
  order?: ChartWallSortOrder;
  onSelect(assetId: string): void;
  onPin(assetId: string): void;
  onCompare(assetId: string): void;
  onResetFilters(): void;
};

export function ChartGrid({ items, sort, order, onSelect, onPin, onCompare, onResetFilters }: ChartGridProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="chart-grid-empty">
        <EmptyState title="没有匹配资产" description="当前筛选或搜索没有命中已采集的真实资产，可以清空条件恢复全市场图表墙。" />
        <Button type="button" variant="ghost" onClick={onResetFilters}>
          清空筛选
        </Button>
      </div>
    );
  }

  return (
    <>
      <RankingQualitySummary items={items} sort={sort} order={order} />
      <div className="chart-wall-grid">
        {items.map((item, index) => (
          <AssetChartCard key={item.id} item={item} sort={sort} rank={index + 1} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
        ))}
      </div>
    </>
  );
}
