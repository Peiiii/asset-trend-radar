import type { ChartWallSortOrder } from "@gold-insights/market-domain";

const assetTypeLabels: Record<string, string> = {
  index: "指数",
  fund: "基金/ETF",
  equity: "公司",
  commodity: "商品",
  macro: "宏观/外汇/债券",
  crypto: "加密"
};

const macdLabels: Record<string, string> = {
  "bullish-cross": "金叉",
  "bearish-cross": "死叉",
  "above-zero": "零轴上",
  "below-zero": "零轴下",
  neutral: "中性"
};

export const sortLabels: Record<string, string> = {
  symbol: "资产",
  market: "市场",
  asset_type: "品种",
  return: "区间涨幅",
  return_1d: "1D 涨幅",
  return_1m: "1M 涨幅",
  return_3m: "3M 涨幅",
  return_6m: "6M 涨幅",
  return_1y: "1Y 涨幅",
  market_cap: "市值",
  volume_ratio: "量比",
  drawdown: "回撤",
  trend_score: "趋势",
  event_count: "事件",
  data_point_count: "数据"
};

export function activeSortCellClassName(active: boolean, baseClassName?: string): string | undefined {
  return [baseClassName, active ? "exchange-table__cell--active-sort" : ""].filter(Boolean).join(" ") || undefined;
}

export function assetTypeLabel(assetType: string): string {
  return assetTypeLabels[assetType] ?? assetType;
}

export function defaultOrderForSort(sort: string): ChartWallSortOrder {
  return sort === "symbol" || sort === "market" || sort === "asset_type" ? "asc" : "desc";
}

export function formatVolumeRatio(value: number | null): string {
  return typeof value === "number" ? `${value.toFixed(2)}x` : "暂无";
}

export function macdLabel(state: string): string {
  return macdLabels[state] ?? state;
}

export function macdTone(state: string): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (state === "bullish-cross" || state === "above-zero") {
    return "positive";
  }

  if (state === "bearish-cross" || state === "below-zero") {
    return "negative";
  }

  return "neutral";
}

export function marketTone(market: string): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (market === "加密" || market === "商品") {
    return "amber";
  }

  if (market === "美股" || market === "港股") {
    return "blue";
  }

  if (market === "基金" || market === "A 股") {
    return "positive";
  }

  return "neutral";
}

export function toggleSortOrder(value: ChartWallSortOrder): ChartWallSortOrder {
  return value === "desc" ? "asc" : "desc";
}

export function volumeRatioTone(value: number | null): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (value === null) {
    return "neutral";
  }

  if (value >= 1.5) {
    return "amber";
  }

  if (value >= 1) {
    return "positive";
  }

  return "neutral";
}
