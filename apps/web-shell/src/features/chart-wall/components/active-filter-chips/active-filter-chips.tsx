import { FilterChip } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ChartWallSortOrder } from "@gold-insights/market-domain";
import "./active-filter-chips.css";

type ActiveFilterKey = "market" | "assetType" | "level" | "tag" | "signal" | "sort" | "order" | "search";

type ActiveFilterValues = Record<ActiveFilterKey, string>;

type ActiveFilterChipOptions = {
  assetTypes: ControlOption[];
  levels: ControlOption[];
  tags: ControlOption[];
  signals: ControlOption[];
  sorts: ControlOption[];
  orders: ControlOption[];
};

type ActiveFilterDefaults = {
  sort: string;
  order: ChartWallSortOrder;
};

type ActiveFilterChipsProps = {
  filters: ActiveFilterValues;
  defaults: ActiveFilterDefaults;
  options: ActiveFilterChipOptions;
  onRemove(key: ActiveFilterKey): void;
  onReset(): void;
};

export function ActiveFilterChips({ filters, defaults, options, onRemove, onReset }: ActiveFilterChipsProps): JSX.Element | null {
  const activeEntries = Object.entries(filters).filter(([key, value]) => !isDefaultFilterValue(key as ActiveFilterKey, value, defaults));

  if (activeEntries.length === 0) {
    return null;
  }

  return (
    <section className="active-filter-strip" aria-label="当前筛选">
      <FilterChip className="active-filter-strip__count" label={`已筛选 ${activeEntries.length}`} />
      {activeEntries.map(([key, value]) => {
        const filterKey = key as ActiveFilterKey;
        const label = `${filterLabel(filterKey)}: ${activeFilterValueLabel(filterKey, value, options)}`;
        return (
          <FilterChip key={key} className="active-filter-strip__chip" label={label} onClick={() => onRemove(filterKey)} title={`移除${label}`} aria-label={`移除${label}`} />
        );
      })}
      <FilterChip className="active-filter-strip__reset" label="清空筛选" onClick={onReset} />
    </section>
  );
}

function filterLabel(key: ActiveFilterKey): string {
  const labels: Record<ActiveFilterKey, string> = {
    market: "市场",
    assetType: "品种",
    level: "层级",
    tag: "主题",
    signal: "信号",
    sort: "排序",
    order: "方向",
    search: "搜索"
  };
  return labels[key];
}

function isDefaultFilterValue(key: ActiveFilterKey, value: string, defaults: ActiveFilterDefaults): boolean {
  return value.length === 0 || value === "all" || (key === "sort" && value === defaults.sort) || (key === "order" && value === defaults.order);
}

function activeFilterValueLabel(key: ActiveFilterKey, value: string, options: ActiveFilterChipOptions): string {
  if (key === "assetType") {
    return optionLabel(options.assetTypes, value);
  }

  if (key === "level") {
    return optionLabel(options.levels, value);
  }

  if (key === "signal") {
    return optionLabel(options.signals, value);
  }

  if (key === "tag") {
    return optionLabel(options.tags, value);
  }

  if (key === "sort") {
    return optionLabel(options.sorts, value);
  }

  if (key === "order") {
    return optionLabel(options.orders, value);
  }

  return value;
}

function optionLabel(options: ControlOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
