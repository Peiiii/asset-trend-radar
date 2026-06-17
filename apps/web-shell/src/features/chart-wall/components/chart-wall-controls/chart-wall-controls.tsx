import { Grid3X3, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton, RangePicker, Select, TimeframePicker } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ChartWallFacet, ChartWallSortOrder } from "@gold-insights/market-domain";
import "./chart-wall-controls.css";

export type ChartWallViewMode = "grid" | "table";

type ChartWallControlsProps = {
  values: {
    market: string;
    assetType: string;
    level: string;
    tag: string;
    signal: string;
    sort: string;
    order: ChartWallSortOrder;
    range: string;
    timeframe: string;
    viewMode: ChartWallViewMode;
  };
  defaults: {
    market: string;
    assetType: string;
    level: string;
    tag: string;
    signal: string;
    sort: string;
    order: ChartWallSortOrder;
    range: string;
    timeframe: string;
  };
  facets?: {
    markets?: ChartWallFacet[];
    assetTypes?: ChartWallFacet[];
    levels?: ChartWallFacet[];
    tags?: ChartWallFacet[];
    signals?: ChartWallFacet[];
  };
  options: {
    markets: ControlOption[];
    assetTypes: ControlOption[];
    levels: ControlOption[];
    tags: ControlOption[];
    signals: ControlOption[];
    sorts: ControlOption[];
    orders: ControlOption[];
  };
  summary: {
    visibleCount: number;
    apiCount: number;
    sortLabel: string;
    orderLabel: string;
  };
  isRefreshing: boolean;
  showViewMode?: boolean;
  activeFilterSlot?: ReactNode;
  onQueryChange(name: string, value: string, fallback?: string): void;
  onSortChange(sort: string, order?: ChartWallSortOrder): void;
  onDefaultOrder(sort: string): ChartWallSortOrder;
  onParseOrder(value: string): ChartWallSortOrder;
  onReset(): void;
  onRefresh(): void;
};

export function ChartWallControls({ values, defaults, facets, options, summary, isRefreshing, showViewMode = true, activeFilterSlot, onQueryChange, onSortChange, onDefaultOrder, onParseOrder, onReset, onRefresh }: ChartWallControlsProps): JSX.Element {
  return (
    <section className="chart-wall-controls" aria-label="图表控制">
      <div className="chart-wall-controls__filters">
        <Select id="market-filter" label="市场" value={values.market} onChange={(value) => onQueryChange("market", value, defaults.market)} options={facetOptions("全部市场", facets?.markets, options.markets)} />
        <Select id="asset-type-filter" label="品种" value={values.assetType} onChange={(value) => onQueryChange("assetType", value, defaults.assetType)} options={facetOptions("全部品种", facets?.assetTypes, options.assetTypes)} />
        <Select id="level-filter" label="层级" value={values.level} onChange={(value) => onQueryChange("level", value, defaults.level)} options={facetOptions("全部层级", facets?.levels, options.levels)} />
        <Select id="tag-filter" label="主题" value={values.tag} onChange={(value) => onQueryChange("tag", value, defaults.tag)} options={facetOptions("全部主题", facets?.tags, options.tags)} />
        <Select id="signal-filter" label="信号" value={values.signal} onChange={(value) => onQueryChange("signal", value, defaults.signal)} options={facetOptions("全部信号", facets?.signals, options.signals)} />
        <Select id="sort-filter" label="排序" value={values.sort} onChange={(value) => onSortChange(value, onDefaultOrder(value))} options={options.sorts} />
        <Select id="sort-order-filter" label="方向" value={values.order} onChange={(value) => onSortChange(values.sort, onParseOrder(value))} options={options.orders} />
      </div>

      <div className="chart-wall-controls__summary" aria-label="当前筛选摘要">
        <span>
          当前 <strong>{summary.visibleCount.toLocaleString("en-US")}</strong>
        </span>
        <span>
          接口 <strong>{summary.apiCount.toLocaleString("en-US")}</strong>
        </span>
        <span>
          排序 <strong>{summary.sortLabel} {summary.orderLabel}</strong>
        </span>
      </div>

      <div className="chart-wall-controls__timeline">
        <RangePicker value={values.range} onChange={(value) => onQueryChange("range", value, defaults.range)} />
        <TimeframePicker value={values.timeframe} onChange={(value) => onQueryChange("timeframe", value, defaults.timeframe)} />
      </div>

      <div className="chart-wall-controls__actions">
        {showViewMode && (
          <div className="chart-wall-controls__view-mode" aria-label="图表墙视图">
            <IconButton label="卡片视图" className={values.viewMode === "grid" ? "gi-icon-button--active" : ""} onClick={() => onQueryChange("view", "grid", "grid")}>
              <Grid3X3 size={17} aria-hidden="true" />
            </IconButton>
            <IconButton label="表格视图" className={values.viewMode === "table" ? "gi-icon-button--active" : ""} onClick={() => onQueryChange("view", "table", "grid")}>
              <Table2 size={17} aria-hidden="true" />
            </IconButton>
          </div>
        )}
        <Button variant="ghost" onClick={onReset}>重置</Button>
        <Button variant="ghost" onClick={onRefresh} disabled={isRefreshing}>{isRefreshing ? "刷新中" : "重新采集"}</Button>
      </div>

      {activeFilterSlot && (
        <div className="chart-wall-controls__active-filters">
          {activeFilterSlot}
        </div>
      )}
    </section>
  );
}

function facetOptions(allLabel: string, facets: ChartWallFacet[] | undefined, fallback: ControlOption[]): ControlOption[] {
  const hasFacetCounts = Boolean(facets);
  const countByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.count]));
  const labelByValue = new Map((facets ?? []).map((facet) => [facet.value, facet.label]));
  const fallbackValues = new Set(fallback.map((option) => option.value));
  const allFacetCount = facets?.find((facet) => facet.value === "all")?.count;
  const facetExtras = (facets ?? [])
    .filter((facet) => facet.value !== "all" && !fallbackValues.has(facet.value))
    .map((facet) => ({ value: facet.value, label: facet.label, count: facet.count }));
  const totalCount = allFacetCount ?? (facets ?? []).filter((facet) => facet.value !== "all").reduce((sum, facet) => sum + facet.count, 0);

  return [
    { value: "all", label: allLabel, count: hasFacetCounts ? totalCount : undefined },
    ...fallback.map((option) => {
      const count = countByValue.get(option.value);
      return {
        ...option,
        label: labelByValue.get(option.value) ?? option.label,
        count: typeof count === "number" ? count : hasFacetCounts ? 0 : undefined
      };
    }),
    ...facetExtras
  ];
}
