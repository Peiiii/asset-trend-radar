import { type MouseEvent, useMemo, useState } from "react";
import type { SparklinePoint } from "@gold-insights/market-domain";
import { chartColors } from "../configs/chart-colors.config";

type SparklineChartProps = {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  showAxes?: boolean;
  showTooltip?: boolean;
};

type ChartPoint = SparklinePoint & {
  x: number;
  y: number;
};

export function SparklineChart({ points, width = 260, height = 110, showAxes = true, showTooltip = true }: SparklineChartProps): JSX.Element {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const frame = showAxes ? { left: 38, right: 8, top: 8, bottom: 22 } : { left: 2, right: 2, top: 2, bottom: 2 };
  const plotWidth = width - frame.left - frame.right;
  const plotHeight = height - frame.top - frame.bottom;
  const chart = useMemo(() => buildChart(points, frame.left, frame.top, plotWidth, plotHeight), [frame.left, frame.top, plotHeight, plotWidth, points]);
  const hoverPoint = hoverIndex === null ? null : chart.points[hoverIndex] ?? null;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>): void => {
    if (!showTooltip || chart.points.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const relativeX = Math.min(Math.max(x - frame.left, 0), plotWidth);
    const index = Math.round((relativeX / plotWidth) * (chart.points.length - 1));
    setHoverIndex(index);
  };

  if (points.length === 0) {
    return (
      <svg className="gi-sparkline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="走势线">
        <title>暂无走势数据</title>
        <path d={`M ${frame.left} ${height / 2} H ${width - frame.right}`} className="gi-sparkline-chart__baseline" />
      </svg>
    );
  }

  const first = points[0]?.c ?? 0;
  const last = points.at(-1)?.c ?? first;
  const lineColor = last >= first ? chartColors.positive : chartColors.negative;

  return (
    <svg className="gi-sparkline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="走势线" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
      <title>{`最新 ${formatPrice(last)}，区间 ${formatPrice(chart.min)} 到 ${formatPrice(chart.max)}`}</title>
      {showAxes && (
        <>
          <line x1={frame.left} x2={width - frame.right} y1={frame.top} y2={frame.top} className="gi-sparkline-chart__grid-line" />
          <line x1={frame.left} x2={width - frame.right} y1={frame.top + plotHeight / 2} y2={frame.top + plotHeight / 2} className="gi-sparkline-chart__grid-line" />
          <line x1={frame.left} x2={width - frame.right} y1={frame.top + plotHeight} y2={frame.top + plotHeight} className="gi-sparkline-chart__axis-line" />
          <text x="2" y={frame.top + 5} className="gi-sparkline-chart__axis-text">
            {formatPrice(chart.max)}
          </text>
          <text x="2" y={frame.top + plotHeight} className="gi-sparkline-chart__axis-text">
            {formatPrice(chart.min)}
          </text>
          <text x={frame.left} y={height - 4} className="gi-sparkline-chart__axis-text">
            {formatDate(points[0]?.t)}
          </text>
          <text x={width - frame.right} y={height - 4} textAnchor="end" className="gi-sparkline-chart__axis-text">
            {formatDate(points.at(-1)?.t)}
          </text>
        </>
      )}
      <path d={chart.path} fill="none" stroke={lineColor} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      {hoverPoint && (
        <g className="gi-sparkline-chart__tooltip">
          <line x1={hoverPoint.x} x2={hoverPoint.x} y1={frame.top} y2={frame.top + plotHeight} />
          <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" />
          <TooltipBox point={hoverPoint} width={width} />
        </g>
      )}
    </svg>
  );
}

function TooltipBox({ point, width }: { point: ChartPoint; width: number }): JSX.Element {
  const boxWidth = 116;
  const boxHeight = 38;
  const x = point.x > width - boxWidth - 8 ? point.x - boxWidth - 7 : point.x + 7;
  const y = Math.max(point.y - boxHeight - 7, 4);

  return (
    <g>
      <rect x={x} y={y} width={boxWidth} height={boxHeight} rx="6" />
      <text x={x + 8} y={y + 15}>
        {formatDate(point.t)}
      </text>
      <text x={x + 8} y={y + 30}>
        收 {formatPrice(point.c)}
      </text>
    </g>
  );
}

function buildChart(points: SparklinePoint[], left: number, top: number, width: number, height: number): { min: number; max: number; path: string; points: ChartPoint[] } {
  const closes = points.map((point) => point.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * width),
    y: top + height - ((point.c - min) / range) * height
  }));
  const path = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return {
    min,
    max,
    path,
    points: chartPoints
  };
}

function formatDate(timestamp: number | undefined): string {
  return timestamp ? new Date(timestamp).toISOString().slice(5, 10) : "--";
}

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(2);
  }
  return value.toFixed(3);
}
