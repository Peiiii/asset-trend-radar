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

export type CompareInsightTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type CompareInsight = {
  id: "leader" | "laggard" | "defensive" | "coverage";
  label: string;
  title: string;
  value: string;
  detail: string;
  tone: CompareInsightTone;
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

export function buildCompareInsights(metrics: CompareMetric[]): CompareInsight[] {
  const returnMetrics = metrics.filter((metric) => metric.rangeReturnPct !== null);
  const drawdownMetrics = metrics.filter((metric) => metric.maxDrawdownPct !== null);

  return [
    buildReturnInsight("leader", "领跑", returnMetrics, (left, right) => (right.rangeReturnPct ?? 0) - (left.rangeReturnPct ?? 0)),
    buildReturnInsight("laggard", "末位", returnMetrics, (left, right) => (left.rangeReturnPct ?? 0) - (right.rangeReturnPct ?? 0)),
    buildDefensiveInsight(drawdownMetrics),
    buildCoverageInsight(metrics)
  ];
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

function buildReturnInsight(
  id: "leader" | "laggard",
  label: string,
  metrics: CompareMetric[],
  compare: (left: CompareMetric, right: CompareMetric) => number
): CompareInsight {
  const target = [...metrics].sort(compare)[0] ?? null;

  if (!target) {
    return {
      id,
      label,
      title: "暂无",
      value: "暂无",
      detail: "缺少可对比收益数据",
      tone: "neutral"
    };
  }

  const tone = id === "leader" ? getReturnTone(target.rangeReturnPct) : getLaggardTone(target.rangeReturnPct);

  return {
    id,
    label,
    title: target.asset.name,
    value: formatPercent(target.rangeReturnPct),
    detail: `${target.asset.symbol} / 区间涨幅`,
    tone
  };
}

function getLaggardTone(value: number | null): CompareInsightTone {
  if (value === null) {
    return "neutral";
  }

  return value < 0 ? "negative" : "blue";
}

function buildDefensiveInsight(metrics: CompareMetric[]): CompareInsight {
  const defensive = [...metrics].sort((left, right) => (right.maxDrawdownPct ?? -Infinity) - (left.maxDrawdownPct ?? -Infinity))[0] ?? null;

  if (!defensive) {
    return {
      id: "defensive",
      label: "抗跌",
      title: "暂无",
      value: "暂无",
      detail: "缺少回撤数据",
      tone: "neutral"
    };
  }

  const drawdown = defensive.maxDrawdownPct ?? null;

  return {
    id: "defensive",
    label: "抗跌",
    title: defensive.asset.name,
    value: formatPercent(drawdown),
    detail: `${defensive.asset.symbol} / 最大回撤`,
    tone: drawdown !== null && drawdown > -10 ? "positive" : "amber"
  };
}

function buildCoverageInsight(metrics: CompareMetric[]): CompareInsight {
  const counts = metrics.map((metric) => metric.dataPointCount);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const coverageRatio = maxCount === 0 ? 0 : minCount / maxCount;
  const isConsistent = metrics.length > 0 && coverageRatio >= 0.9;

  return {
    id: "coverage",
    label: "样本",
    title: isConsistent ? "覆盖一致" : "覆盖不齐",
    value: maxCount === minCount ? `${maxCount.toLocaleString("en-US")} 点` : `${minCount.toLocaleString("en-US")} - ${maxCount.toLocaleString("en-US")} 点`,
    detail: `${metrics.length.toLocaleString("en-US")} 个资产参与对比`,
    tone: isConsistent ? "blue" : "amber"
  };
}
