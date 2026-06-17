import { GitCompare, Pin } from "lucide-react";
import { Button, EmptyState, SignalBadge, TechnicalChart } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import { formatDateTime, formatPrice } from "@/shared/utils/format-number.utils";
import { AssetChartCard } from "../asset-chart-card";
import { assetTypeLabel, breakoutLabel, breakoutTone, buildReturnMetrics, drawdownTone, formatNumber, formatPercent, macdLabel, macdTone, returnTone } from "./asset-detail-section.utils";
import "./asset-detail-section.css";

type AssetDetailSectionProps = {
  item: ChartWallItem | null;
  relatedItems: ChartWallItem[];
  onSelect(assetId: string): void;
  onPin(assetId: string): void;
  onCompare(assetId: string): void;
};

export function AssetDetailSection({ item, relatedItems, onSelect, onPin, onCompare }: AssetDetailSectionProps): JSX.Element {
  if (!item) {
    return <EmptyState title="没有可查看资产" description="当前筛选条件下没有资产。" />;
  }

  const topEvents = [...item.events].sort((left, right) => right.severity - left.severity).slice(0, 4);

  return (
    <section className="single-view-section asset-detail-section">
      <div className="asset-detail-summary">
        <div className="asset-detail-summary__identity">
          <div className="asset-detail-context-row">
            <span>{item.market}</span>
            <span>{assetTypeLabel(item.assetType)}</span>
            <span>{item.exchange}</span>
            <span>{item.source ?? item.dataSource ?? "unknown"}</span>
          </div>
          <h2>{item.name}</h2>
          <p>{item.symbol} / 最新 {formatDateTime(item.latestBarAt)}</p>
        </div>
        <div className="asset-detail-summary__metrics">
          <DetailMetric label="最新价" value={formatPrice(item.lastPrice, item.currency)} />
          <DetailMetric label="区间涨幅" value={formatPercent(item.returnPct)} tone={returnTone(item.returnPct)} />
          <DetailMetric label="趋势分" value={String(item.trendScore)} tone={item.trendScore >= 60 ? "positive" : item.trendScore <= 35 ? "negative" : "neutral"} />
          <DetailMetric label="当前回撤" value={formatPercent(item.drawdownPct)} tone={drawdownTone(item.drawdownPct)} />
        </div>
      </div>

      <div className="asset-detail-grid">
        <article className="asset-detail-main">
          <div className="asset-detail-signal-strip" aria-label="资产信号">
            <SignalBadge label={item.trendLabel} tone={item.trendScore >= 60 ? "positive" : item.trendScore <= 35 ? "negative" : "neutral"} />
            <SignalBadge label={macdLabel(item.macdState)} tone={macdTone(item.macdState)} />
            <SignalBadge label={breakoutLabel(item.breakoutState)} tone={breakoutTone(item.breakoutState)} />
            {typeof item.volumeRatio === "number" && <SignalBadge label={`量比 ${item.volumeRatio.toFixed(2)}x`} tone={item.volumeRatio >= 1.5 ? "amber" : "neutral"} />}
            <SignalBadge label={`事件 ${item.events.length}`} tone={item.events.length > 0 ? "amber" : "neutral"} />
          </div>
          <TechnicalChart points={item.sparkline} indicators={item.indicators} height={430} showMacdSignalLines variant="detail" />
          <div className="return-matrix" aria-label="固定周期收益">
            {buildReturnMetrics(item).map((metric) => (
              <DetailMetric key={metric.label} label={metric.label} value={formatPercent(metric.value)} tone={returnTone(metric.value)} />
            ))}
          </div>
          <div className="asset-detail-main__actions">
            <Button onClick={() => onPin(item.id)}>
              <Pin size={15} aria-hidden="true" />
              {item.isPinned ? "取消自选" : "加入自选"}
            </Button>
            <Button onClick={() => onCompare(item.id)} variant="ghost">
              <GitCompare size={15} aria-hidden="true" />
              {item.isCompared ? "取消对比" : "加入对比"}
            </Button>
          </div>
        </article>

        <aside className="asset-detail-side">
          <section>
            <h2>指标快照</h2>
            <dl>
              <DetailRow label="MACD" value={`${macdLabel(item.macdState)} / Hist ${formatNumber(item.macdHist)}`} />
              <DetailRow label="DIF / DEA" value={`${formatNumber(item.macdDif)} / ${formatNumber(item.macdDea)}`} />
              <DetailRow label="MA20 / MA50 / MA200" value={`${formatNumber(item.ma20)} / ${formatNumber(item.ma50)} / ${formatNumber(item.ma200)}`} />
              <DetailRow label="RSI14" value={formatNumber(item.rsi14)} />
              <DetailRow label="突破状态" value={breakoutLabel(item.breakoutState)} />
              <DetailRow label="数据覆盖" value={`${formatDateTime(item.firstBarAt)} - ${formatDateTime(item.latestBarAt)}`} />
              <DetailRow label="数据点" value={(item.dataPointCount ?? item.sparkline.length).toLocaleString("en-US")} />
            </dl>
          </section>
          <section>
            <h2>重点事件</h2>
            {topEvents.length === 0 ? (
              <EmptyState title="暂无触发事件" description="该资产当前没有触发已配置的扫描规则。" />
            ) : (
              <div className="asset-detail-event-list">
                {topEvents.map((event) => (
                  <article key={event.id} className="asset-detail-event-card">
                    <header>
                      <strong>{event.title}</strong>
                      <span>{event.severity}</span>
                    </header>
                    <p>{event.summary}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {relatedItems.length > 0 && (
        <section className="asset-detail-related">
          <div className="section-title-row">
            <div>
              <h2>相关资产</h2>
              <p>同市场内的可比资产</p>
            </div>
          </div>
          <div className="chart-wall-grid">
            {relatedItems.map((relatedItem) => (
              <AssetChartCard key={relatedItem.id} item={relatedItem} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function DetailMetric({ label, value, tone = "neutral" }: { label: string; value: string | JSX.Element; tone?: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <div className={`asset-detail-metric asset-detail-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
