import { X } from "lucide-react";
import { useMemo } from "react";
import { Button, LoadingState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import type { CompareData } from "@/shared/types/api.types";
import { ComparePerformanceChart } from "./compare-performance-chart";
import { buildCompareMetrics, formatPercent, formatPriceValue, getReturnTone } from "./compare-panel.utils";
import "./compare-panel.css";

type ComparePanelProps = {
  compareData: CompareData | null;
  compareAssetIds: string[];
  allItems: ChartWallItem[];
  onRemove(assetId: string): void;
  onClear(): void;
};

export function ComparePanel({ compareData, compareAssetIds, allItems, onRemove, onClear }: ComparePanelProps): JSX.Element | null {
  const metrics = useMemo(() => compareData ? buildCompareMetrics(compareData, allItems) : [], [allItems, compareData]);

  if (compareAssetIds.length < 2) {
    return null;
  }

  return (
    <section className="compare-panel">
      <div className="section-title-row">
        <div>
          <h2>多资产对比</h2>
          <p>{compareData ? `${compareData.range} / ${compareData.timeframe}，归一化起点对比` : `${compareAssetIds.length} 个资产`}</p>
        </div>
        <Button variant="ghost" onClick={onClear}>清空</Button>
      </div>

      <div className="compare-token-row" aria-label="当前对比资产">
        {compareAssetIds.map((assetId) => {
          const item = allItems.find((candidate) => candidate.id === assetId);
          return (
            <button key={assetId} type="button" onClick={() => onRemove(assetId)} title="从对比中移除">
              {item?.name ?? item?.symbol ?? assetId}
              <X size={13} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {!compareData ? (
        <LoadingState />
      ) : (
        <>
          <ComparePerformanceChart metrics={metrics} />
          <div className="compare-metric-table-wrapper">
            <table className="compare-metric-table">
              <thead>
                <tr>
                  <th>资产</th>
                  <th>市场</th>
                  <th>最新价</th>
                  <th>区间涨幅</th>
                  <th>最大回撤</th>
                  <th>数据点</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.asset.id}>
                    <td>
                      <span className="compare-asset-cell">
                        <span className="compare-line-swatch" style={{ background: metric.color }} aria-hidden="true" />
                        <span>
                          <strong>{metric.asset.name}</strong>
                          <small>{metric.asset.symbol}</small>
                        </span>
                      </span>
                    </td>
                    <td><SignalBadge label={metric.asset.market} tone="blue" /></td>
                    <td>{formatPriceValue(metric.latestPrice, metric.asset.currency)}</td>
                    <td><PriceChange value={metric.rangeReturnPct} /></td>
                    <td><SignalBadge label={formatPercent(metric.maxDrawdownPct)} tone={getReturnTone(metric.maxDrawdownPct)} /></td>
                    <td>{metric.dataPointCount.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
