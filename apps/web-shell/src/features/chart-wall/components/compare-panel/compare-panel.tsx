import { GitCompare, X } from "lucide-react";
import { useMemo } from "react";
import { Button, LoadingState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import type { CompareData } from "@/shared/types/api.types";
import { CompareInsightStrip } from "./compare-insight-strip";
import { ComparePerformanceChart } from "./compare-performance-chart";
import { buildCompareInsights, buildCompareMetrics, formatPercent, formatPriceValue, getReturnTone } from "./compare-panel.utils";
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
  const insights = useMemo(() => buildCompareInsights(metrics), [metrics]);

  if (compareAssetIds.length === 0) {
    return null;
  }

  return (
    <section className={`compare-panel ${compareAssetIds.length < 2 ? "compare-panel--pending" : ""}`}>
      <div className="section-title-row">
        <div>
          <h2>多资产对比</h2>
          <p>{compareData ? `${compareData.range} / ${compareData.timeframe}，归一化起点对比` : compareAssetIds.length < 2 ? "已选择 1 个资产，再选择 1 个即可开始对比" : `${compareAssetIds.length} 个资产`}</p>
        </div>
        <Button variant="ghost" onClick={onClear}>清空</Button>
      </div>

      <CompareTokenRow compareAssetIds={compareAssetIds} allItems={allItems} onRemove={onRemove} />

      {compareAssetIds.length < 2 && (
        <div className="compare-panel__pending">
          <GitCompare size={18} aria-hidden="true" />
          <span>继续从榜单、图表卡片或表格里加入一个资产，系统会自动生成归一化走势对比。</span>
        </div>
      )}

      {compareAssetIds.length >= 2 && !compareData ? (
        <LoadingState />
      ) : compareData ? (
        <>
          <CompareInsightStrip insights={insights} />
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
      ) : null}
    </section>
  );
}

function CompareTokenRow({ compareAssetIds, allItems, onRemove }: { compareAssetIds: string[]; allItems: ChartWallItem[]; onRemove(assetId: string): void }): JSX.Element {
  return (
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
  );
}
