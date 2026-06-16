import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CompareMetric, ComparePerformancePoint } from "./compare-panel.utils";
import { formatPercent } from "./compare-panel.utils";

type ComparePerformanceChartProps = {
  metrics: CompareMetric[];
};

type ChartPoint = ComparePerformancePoint & {
  x: number;
  y: number;
};

type ChartSeries = {
  id: string;
  name: string;
  symbol: string;
  color: string;
  path: string;
  points: ChartPoint[];
};

export function ComparePerformanceChart({ metrics }: ComparePerformanceChartProps): JSX.Element {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [hoverTs, setHoverTs] = useState<number | null>(null);
  const [chartSize, setChartSize] = useState({ width: 680, height: 280 });
  const chartWidth = Math.max(chartSize.width, 320);
  const chartHeight = Math.max(chartSize.height, 240);
  const frame = { left: 52, right: 14, top: 16, bottom: 30 };
  const plotWidth = chartWidth - frame.left - frame.right;
  const plotHeight = chartHeight - frame.top - frame.bottom;
  const chart = useMemo(() => buildCompareChart(metrics, frame.left, frame.top, plotWidth, plotHeight), [frame.left, frame.top, metrics, plotHeight, plotWidth]);
  const hoverPoints = hoverTs === null ? [] : chart.series.map((series) => ({ series, point: nearestPoint(series.points, hoverTs) })).filter((item) => item.point !== null);

  useEffect(() => {
    const element = frameRef.current;

    if (!element) {
      return undefined;
    }

    const updateSize = (): void => {
      const rect = element.getBoundingClientRect();
      setChartSize((current) => {
        const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
        return current.width === next.width && current.height === next.height ? current : next;
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>): void => {
    if (chart.series.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const ratio = Math.min(Math.max((x - frame.left) / plotWidth, 0), 1);
    setHoverTs(chart.minTs + ratio * (chart.maxTs - chart.minTs));
  };

  if (chart.series.length === 0) {
    return (
      <div ref={frameRef} className="compare-performance-chart">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="归一化对比走势">
          <title>暂无对比走势数据</title>
          <line x1={frame.left} x2={chartWidth - frame.right} y1={chartHeight / 2} y2={chartHeight / 2} className="compare-performance-chart__axis" />
        </svg>
      </div>
    );
  }

  const hoverGuideX = hoverPoints[0]?.point?.x ?? null;

  return (
    <div ref={frameRef} className="compare-performance-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="归一化对比走势" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTs(null)}>
        <title>多资产归一化涨跌幅对比</title>
        {[chart.maxReturn, 0, chart.minReturn].map((value) => {
          const y = scaleY(value, chart.minReturn, chart.maxReturn, frame.top, plotHeight);
          return (
            <g key={value}>
              <line x1={frame.left} x2={chartWidth - frame.right} y1={y} y2={y} className={value === 0 ? "compare-performance-chart__axis" : "compare-performance-chart__grid"} />
              <text x="4" y={y + 4} className="compare-performance-chart__axis-text">{formatPercent(value)}</text>
            </g>
          );
        })}
        <text x={frame.left} y={chartHeight - 7} className="compare-performance-chart__axis-text">{formatDate(chart.minTs)}</text>
        <text x={chartWidth - frame.right} y={chartHeight - 7} textAnchor="end" className="compare-performance-chart__axis-text">{formatDate(chart.maxTs)}</text>

        {chart.series.map((series) => (
          <path key={series.id} d={series.path} fill="none" stroke={series.color} strokeWidth="2.3" vectorEffect="non-scaling-stroke" />
        ))}

        {hoverGuideX !== null && (
          <g className="compare-performance-chart__hover">
            <line x1={hoverGuideX} x2={hoverGuideX} y1={frame.top} y2={chartHeight - frame.bottom} />
            {hoverPoints.map(({ series, point }) => point && (
              <circle key={series.id} cx={point.x} cy={point.y} r="3" fill={series.color} />
            ))}
            <Tooltip x={hoverGuideX} width={chartWidth} points={hoverPoints} />
          </g>
        )}
      </svg>
    </div>
  );
}

function Tooltip({
  x,
  width,
  points
}: {
  x: number;
  width: number;
  points: Array<{ series: ChartSeries; point: ChartPoint | null }>;
}): JSX.Element {
  const boxWidth = 184;
  const boxHeight = Math.min(28 + points.length * 17, 132);
  const boxX = x > width - boxWidth - 10 ? x - boxWidth - 8 : x + 8;
  const boxY = 18;
  const firstPoint = points[0]?.point ?? null;

  return (
    <g>
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} rx="7" />
      <text x={boxX + 9} y={boxY + 16}>{formatDate(firstPoint?.ts ?? null)}</text>
      {points.slice(0, 6).map(({ series, point }, index) => point && (
        <text key={series.id} x={boxX + 9} y={boxY + 34 + index * 17} fill={series.color}>
          {series.symbol} {formatPercent(point.returnPct)}
        </text>
      ))}
    </g>
  );
}

function buildCompareChart(metrics: CompareMetric[], left: number, top: number, width: number, height: number): {
  minTs: number;
  maxTs: number;
  minReturn: number;
  maxReturn: number;
  series: ChartSeries[];
} {
  const allPoints = metrics.flatMap((metric) => metric.points);

  if (allPoints.length === 0) {
    return { minTs: 0, maxTs: 1, minReturn: -1, maxReturn: 1, series: [] };
  }

  const minTs = Math.min(...allPoints.map((point) => point.ts));
  const maxTs = Math.max(...allPoints.map((point) => point.ts));
  const returns = allPoints.map((point) => point.returnPct);
  const minReturn = Math.min(0, ...returns);
  const maxReturn = Math.max(0, ...returns);
  const paddedMinReturn = minReturn - Math.max((maxReturn - minReturn) * 0.08, 1);
  const paddedMaxReturn = maxReturn + Math.max((maxReturn - minReturn) * 0.08, 1);
  const series = metrics
    .map((metric) => {
      const points = metric.points.map((point) => ({
        ...point,
        x: left + ((point.ts - minTs) / (maxTs - minTs || 1)) * width,
        y: scaleY(point.returnPct, paddedMinReturn, paddedMaxReturn, top, height)
      }));

      return {
        id: metric.asset.id,
        name: metric.asset.name,
        symbol: metric.asset.symbol,
        color: metric.color,
        path: toLinePath(points),
        points
      };
    })
    .filter((series) => series.points.length > 0);

  return {
    minTs,
    maxTs,
    minReturn: paddedMinReturn,
    maxReturn: paddedMaxReturn,
    series
  };
}

function scaleY(value: number, min: number, max: number, top: number, height: number): number {
  return top + height - ((value - min) / (max - min || 1)) * height;
}

function nearestPoint(points: ChartPoint[], timestamp: number): ChartPoint | null {
  return points.reduce<ChartPoint | null>((nearest, point) => {
    if (!nearest) {
      return point;
    }

    return Math.abs(point.ts - timestamp) < Math.abs(nearest.ts - timestamp) ? point : nearest;
  }, null);
}

function toLinePath(points: ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function formatDate(timestamp: number | null): string {
  return timestamp ? new Date(timestamp).toISOString().slice(5, 10) : "--";
}
