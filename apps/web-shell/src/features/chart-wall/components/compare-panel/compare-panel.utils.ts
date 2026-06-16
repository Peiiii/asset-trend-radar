import type { ChartWallItem, CompareResponse, OhlcvBar } from "@gold-insights/market-domain";

export type CompareMetric = {
  asset: CompareResponse["assets"][number]["asset"];
  color: string;
  bars: OhlcvBar[];
  points: ComparePerformancePoint[];
  latestPrice: number | null;
  rangeReturnPct: number | null;
  maxDrawdownPct: number | null;
  dataPointCount: number;
  chartWallItem: ChartWallItem | null;
};

export type ComparePerformancePoint = {
  ts: number;
  close: number;
  returnPct: number;
};

const linePalette = ["#1d4f91", "#b7791f", "#16846e", "#bf3d3d", "#64748b", "#7c3aed"];

export function buildCompareMetrics(data: CompareResponse, allItems: ChartWallItem[]): CompareMetric[] {
  return data.assets.map(({ asset, bars }, index) => {
    const points = toPerformancePoints(bars);
    const latestPoint = points.at(-1) ?? null;

    return {
      asset,
      color: linePalette[index % linePalette.length] ?? "#64748b",
      bars,
      points,
      latestPrice: latestPoint?.close ?? null,
      rangeReturnPct: latestPoint?.returnPct ?? null,
      maxDrawdownPct: calculateMaxDrawdownPct(bars),
      dataPointCount: bars.length,
      chartWallItem: allItems.find((item) => item.id === asset.id) ?? null
    };
  });
}

export function getReturnTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value === null) {
    return "neutral";
  }

  return value >= 0 ? "positive" : "negative";
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "暂无";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatPriceValue(value: number | null, currency: string): string {
  if (value === null) {
    return "暂无";
  }

  const maximumFractionDigits = value > 100 ? 2 : value > 1 ? 4 : 6;
  return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${currency}`;
}

function toPerformancePoints(bars: OhlcvBar[]): ComparePerformancePoint[] {
  const firstClose = bars.find((bar) => bar.close > 0)?.close ?? null;

  if (firstClose === null) {
    return [];
  }

  return bars.map((bar) => ({
    ts: bar.ts,
    close: bar.close,
    returnPct: (bar.close / firstClose - 1) * 100
  }));
}

function calculateMaxDrawdownPct(bars: OhlcvBar[]): number | null {
  let peak: number | null = null;
  let maxDrawdown = 0;

  for (const bar of bars) {
    if (bar.close <= 0) {
      continue;
    }

    peak = peak === null ? bar.close : Math.max(peak, bar.close);
    maxDrawdown = Math.min(maxDrawdown, (bar.close / peak - 1) * 100);
  }

  return peak === null ? null : maxDrawdown;
}
