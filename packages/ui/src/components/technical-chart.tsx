import { type MouseEvent, useMemo, useState } from "react";
import type { IndicatorPoint, SparklinePoint } from "@gold-insights/market-domain";
import { chartColors } from "../configs/chart-colors.config";

type TechnicalChartProps = {
  points: SparklinePoint[];
  indicators: IndicatorPoint[];
  width?: number;
  height?: number;
  showMacdSignalLines?: boolean;
};

type TechnicalPoint = SparklinePoint & {
  indicator: IndicatorPoint | null;
  x: number;
  priceY: number;
  histY: number;
  histHeight: number;
};

export function TechnicalChart({ points, indicators, width = 300, height = 172, showMacdSignalLines = false }: TechnicalChartProps): JSX.Element {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const frame = { left: 40, right: 8, top: 8, bottom: 20 };
  const priceHeight = Math.round((height - frame.top - frame.bottom) * 0.58);
  const panelGap = 12;
  const macdTop = frame.top + priceHeight + panelGap;
  const macdHeight = Math.max(height - frame.bottom - macdTop, 34);
  const plotWidth = width - frame.left - frame.right;
  const chart = useMemo(
    () => buildTechnicalChart(points, indicators, frame.left, frame.top, plotWidth, priceHeight, macdTop, macdHeight, showMacdSignalLines),
    [frame.left, frame.top, indicators, macdHeight, macdTop, plotWidth, points, priceHeight, showMacdSignalLines]
  );
  const hoverPoint = hoverIndex === null ? null : chart.points[hoverIndex] ?? null;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>): void => {
    if (chart.points.length === 0) {
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
      <svg className="gi-technical-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="价格与 MACD 技术图">
        <title>暂无技术图数据</title>
        <line x1={frame.left} x2={width - frame.right} y1={height / 2} y2={height / 2} className="gi-technical-chart__grid-line" />
      </svg>
    );
  }

  const first = points[0]?.c ?? 0;
  const last = points.at(-1)?.c ?? first;
  const lineColor = last >= first ? chartColors.positive : chartColors.negative;
  const barWidth = chart.points.length > 0 ? Math.max(plotWidth / chart.points.length - 1, 1.2) : 1.2;

  return (
    <svg className="gi-technical-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="价格与 MACD 技术图" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
      <title>{`最新 ${formatPrice(last)}，MACD ${formatValue(chart.points.at(-1)?.indicator?.macdHist ?? null)}`}</title>
      <line x1={frame.left} x2={width - frame.right} y1={frame.top} y2={frame.top} className="gi-technical-chart__grid-line" />
      <line x1={frame.left} x2={width - frame.right} y1={frame.top + priceHeight / 2} y2={frame.top + priceHeight / 2} className="gi-technical-chart__grid-line" />
      <line x1={frame.left} x2={width - frame.right} y1={frame.top + priceHeight} y2={frame.top + priceHeight} className="gi-technical-chart__axis-line" />
      <text x="2" y={frame.top + 5} className="gi-technical-chart__axis-text">
        {formatPrice(chart.priceMax)}
      </text>
      <text x="2" y={frame.top + priceHeight} className="gi-technical-chart__axis-text">
        {formatPrice(chart.priceMin)}
      </text>

      <path d={chart.pricePath} fill="none" stroke={lineColor} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />

      <line x1={frame.left} x2={width - frame.right} y1={chart.macdZeroY} y2={chart.macdZeroY} className="gi-technical-chart__macd-zero" />
      <text x="2" y={macdTop + 8} className="gi-technical-chart__axis-text">
        MACD
      </text>
      {chart.points.map((point, index) => (
        <rect
          key={`${point.t}-${index}`}
          x={point.x - barWidth / 2}
          y={point.histY}
          width={barWidth}
          height={point.histHeight}
          rx="1"
          fill={(point.indicator?.macdHist ?? 0) >= 0 ? chartColors.macdPositive : chartColors.macdNegative}
        />
      ))}
      {showMacdSignalLines && chart.difPath && <path d={chart.difPath} fill="none" stroke={chartColors.blue} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />}
      {showMacdSignalLines && chart.deaPath && <path d={chart.deaPath} fill="none" stroke={chartColors.amber} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />}

      <text x={frame.left} y={height - 4} className="gi-technical-chart__axis-text">
        {formatDate(points[0]?.t)}
      </text>
      <text x={width - frame.right} y={height - 4} textAnchor="end" className="gi-technical-chart__axis-text">
        {formatDate(points.at(-1)?.t)}
      </text>

      {hoverPoint && (
        <g className="gi-technical-chart__tooltip">
          <line x1={hoverPoint.x} x2={hoverPoint.x} y1={frame.top} y2={height - frame.bottom} />
          <circle cx={hoverPoint.x} cy={hoverPoint.priceY} r="3" />
          <TooltipBox point={hoverPoint} width={width} />
        </g>
      )}
    </svg>
  );
}

function TooltipBox({ point, width }: { point: TechnicalPoint; width: number }): JSX.Element {
  const boxWidth = 136;
  const boxHeight = 58;
  const x = point.x > width - boxWidth - 8 ? point.x - boxWidth - 7 : point.x + 7;
  const y = Math.max(point.priceY - boxHeight - 7, 4);

  return (
    <g>
      <rect x={x} y={y} width={boxWidth} height={boxHeight} rx="6" />
      <text x={x + 8} y={y + 15}>
        {formatDate(point.t)} 收 {formatPrice(point.c)}
      </text>
      <text x={x + 8} y={y + 31}>
        Hist {formatValue(point.indicator?.macdHist ?? null)}
      </text>
      <text x={x + 8} y={y + 47}>
        DIF {formatValue(point.indicator?.macdDif ?? null)} DEA {formatValue(point.indicator?.macdDea ?? null)}
      </text>
    </g>
  );
}

function buildTechnicalChart(
  points: SparklinePoint[],
  indicators: IndicatorPoint[],
  left: number,
  top: number,
  plotWidth: number,
  priceHeight: number,
  macdTop: number,
  macdHeight: number,
  showMacdSignalLines: boolean
): {
  priceMin: number;
  priceMax: number;
  pricePath: string;
  difPath: string;
  deaPath: string;
  macdZeroY: number;
  points: TechnicalPoint[];
} {
  const indicatorByTs = new Map(indicators.map((indicator) => [indicator.ts, indicator]));
  const alignedIndicators = points.map((point, index) => indicatorByTs.get(point.t) ?? indicators[index + indicators.length - points.length] ?? null);
  const closes = points.map((point) => point.c);
  const priceMin = Math.min(...closes);
  const priceMax = Math.max(...closes);
  const priceRange = priceMax - priceMin || 1;
  const macdValues = alignedIndicators.flatMap((indicator) => [
    indicator?.macdHist ?? 0,
    ...(showMacdSignalLines ? [indicator?.macdDif ?? 0, indicator?.macdDea ?? 0] : [])
  ]);
  const macdMaxAbs = Math.max(...macdValues.map((value) => Math.abs(value)), 0.000001);
  const macdZeroY = macdTop + macdHeight / 2;
  const macdScale = (macdHeight / 2 - 3) / macdMaxAbs;

  const chartPoints = points.map((point, index) => {
    const indicator = alignedIndicators[index];
    const hist = indicator?.macdHist ?? 0;
    const x = left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const priceY = top + priceHeight - ((point.c - priceMin) / priceRange) * priceHeight;
    const histHeight = Math.max(Math.abs(hist) * macdScale, 1);
    const histY = hist >= 0 ? macdZeroY - histHeight : macdZeroY;
    return {
      ...point,
      indicator,
      x,
      priceY,
      histY,
      histHeight
    };
  });

  return {
    priceMin,
    priceMax,
    pricePath: toLinePath(chartPoints, (point) => point.priceY),
    difPath: toIndicatorPath(chartPoints, macdZeroY, macdScale, (indicator) => indicator.macdDif),
    deaPath: toIndicatorPath(chartPoints, macdZeroY, macdScale, (indicator) => indicator.macdDea),
    macdZeroY,
    points: chartPoints
  };
}

function toLinePath(points: TechnicalPoint[], getY: (point: TechnicalPoint) => number): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${getY(point).toFixed(2)}`).join(" ");
}

function toIndicatorPath(points: TechnicalPoint[], zeroY: number, scale: number, getValue: (indicator: IndicatorPoint) => number | null): string {
  return points
    .map((point) => {
      const value = point.indicator ? getValue(point.indicator) : null;
      return value === null ? null : { x: point.x, y: zeroY - value * scale };
    })
    .filter((point): point is { x: number; y: number } => point !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
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

function formatValue(value: number | null): string {
  return value === null ? "--" : value.toFixed(3);
}
