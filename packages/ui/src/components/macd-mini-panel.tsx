import type { IndicatorPoint } from "@gold-insights/market-domain";
import { chartColors } from "../configs/chart-colors.config";

type MacdMiniPanelProps = {
  points: IndicatorPoint[];
};

export function MacdMiniPanel({ points }: MacdMiniPanelProps): JSX.Element {
  const latest = points.at(-1);
  const histogram = points.slice(-36).map((point) => point.macdHist ?? 0);
  const width = 148;
  const height = 44;
  const centerY = height / 2;
  const maxAbs = Math.max(...histogram.map((value) => Math.abs(value)), 1);
  const barGap = 1.5;
  const barWidth = histogram.length > 0 ? Math.max((width - barGap * (histogram.length - 1)) / histogram.length, 1.5) : width;

  return (
    <div className="gi-macd-mini-panel">
      <div className="gi-macd-mini-panel__meta">
        <span>MACD</span>
        <strong>{latest?.macdHist === null || latest?.macdHist === undefined ? "暂无" : latest.macdHist.toFixed(3)}</strong>
      </div>
      <svg className="gi-macd-mini-panel__bars" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="MACD 柱">
        <title>{latest ? `DIF ${formatValue(latest.macdDif)} DEA ${formatValue(latest.macdDea)} Hist ${formatValue(latest.macdHist)}` : "暂无 MACD"}</title>
        <line x1="0" x2={width} y1={centerY} y2={centerY} className="gi-macd-mini-panel__zero-line" />
        {histogram.map((value, index) => {
          const barHeight = Math.max((Math.abs(value) / maxAbs) * (centerY - 3), 1);
          const x = index * (barWidth + barGap);
          const y = value >= 0 ? centerY - barHeight : centerY;
          return <rect key={`${index}-${value}`} x={x} y={y} width={barWidth} height={barHeight} rx="1" fill={value >= 0 ? chartColors.macdPositive : chartColors.macdNegative} />;
        })}
      </svg>
    </div>
  );
}

function formatValue(value: number | null): string {
  return value === null ? "暂无" : value.toFixed(3);
}
