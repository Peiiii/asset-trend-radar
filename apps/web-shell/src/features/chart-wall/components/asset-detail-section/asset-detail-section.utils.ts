import type { AssetType, ChartWallItem, MacdState } from "@gold-insights/market-domain";

export type Tone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type DetailReturnMetric = {
  label: string;
  value: number | null;
};

export type PriceRangeStats = {
  high: number;
  low: number;
  positionPct: number;
  distanceToHighPct: number | null;
  distanceFromLowPct: number | null;
  label: string;
  tone: Tone;
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

export function buildPriceRangeStats(item: ChartWallItem): PriceRangeStats | null {
  const points = item.sparkline.filter((point) => Number.isFinite(point.h) && Number.isFinite(point.l));
  const latest = item.lastPrice ?? item.sparkline.at(-1)?.c ?? null;

  if (points.length === 0 || latest === null || !Number.isFinite(latest)) {
    return null;
  }

  const high = Math.max(...points.map((point) => point.h));
  const low = Math.min(...points.map((point) => point.l));

  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) {
    return null;
  }

  const positionPct = clampPercent(((latest - low) / (high - low)) * 100);

  return {
    high,
    low,
    positionPct,
    distanceToHighPct: high > 0 ? ((latest - high) / high) * 100 : null,
    distanceFromLowPct: low > 0 ? ((latest - low) / low) * 100 : null,
    label: priceRangePositionLabel(positionPct),
    tone: priceRangePositionTone(positionPct)
  };
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

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function priceRangePositionLabel(positionPct: number): string {
  if (positionPct >= 85) {
    return "接近区间高位";
  }

  if (positionPct >= 65) {
    return "区间上沿";
  }

  if (positionPct > 35) {
    return "区间中部";
  }

  if (positionPct > 15) {
    return "区间下沿";
  }

  return "接近区间低位";
}

function priceRangePositionTone(positionPct: number): Tone {
  if (positionPct >= 85) {
    return "blue";
  }

  if (positionPct >= 65) {
    return "positive";
  }

  if (positionPct > 35) {
    return "neutral";
  }

  if (positionPct > 15) {
    return "amber";
  }

  return "negative";
}
