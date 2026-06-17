import type { AssetType, ChartWallItem, MacdState } from "@gold-insights/market-domain";

export type Tone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type DetailReturnMetric = {
  label: string;
  value: number | null;
};

export function assetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    index: "指数",
    fund: "基金/ETF",
    equity: "公司",
    commodity: "商品",
    macro: "宏观",
    crypto: "加密"
  };

  return labels[type] ?? type;
}

export function macdLabel(state: MacdState): string {
  const labels: Record<MacdState, string> = {
    "bullish-cross": "MACD 金叉",
    "bearish-cross": "MACD 死叉",
    "above-zero": "零轴上",
    "below-zero": "零轴下",
    neutral: "中性"
  };

  return labels[state] ?? state;
}

export function macdTone(state: MacdState): Tone {
  if (state === "bullish-cross" || state === "above-zero") {
    return "positive";
  }

  if (state === "bearish-cross" || state === "below-zero") {
    return "negative";
  }

  return "neutral";
}

export function breakoutLabel(state: string): string {
  if (state === "breakout-60d") {
    return "60D 突破";
  }

  if (state === "breakout-20d") {
    return "20D 突破";
  }

  if (state === "insufficient-data") {
    return "数据积累中";
  }

  return "区间内";
}

export function breakoutTone(state: string): Tone {
  return state.startsWith("breakout") ? "blue" : "neutral";
}

export function returnTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined) {
    return "neutral";
  }

  return value >= 0 ? "positive" : "negative";
}

export function drawdownTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value <= -20) {
    return "negative";
  }

  if (value <= -10) {
    return "amber";
  }

  return "positive";
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : value.toFixed(2);
}

export function formatCompactQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "暂无";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1_000 ? 0 : 2,
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard"
  });
}

export function formatRatio(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : `${value.toFixed(2)}x`;
}

export function volumeRatioTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value >= 1.5) {
    return "amber";
  }

  if (value >= 1) {
    return "positive";
  }

  if (value < 0.6) {
    return "negative";
  }

  return "neutral";
}

export function volumeActivityLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "暂无";
  }

  if (value >= 1.5) {
    return "明显放量";
  }

  if (value >= 1) {
    return "高于均量";
  }

  if (value < 0.6) {
    return "明显缩量";
  }

  return "接近均量";
}

export function buildReturnMetrics(item: ChartWallItem): DetailReturnMetric[] {
  return [
    { label: "1D", value: item.return1d },
    { label: "1W", value: item.return1w },
    { label: "1M", value: item.return1m },
    { label: "3M", value: item.return3m },
    { label: "6M", value: item.return6m },
    { label: "1Y", value: item.return1y }
  ];
}
