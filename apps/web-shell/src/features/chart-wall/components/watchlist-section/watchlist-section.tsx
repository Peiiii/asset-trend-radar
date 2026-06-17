import { FilterX, GitCompare, PinOff } from "lucide-react";
import { Button, EmptyState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem, WatchlistSummary } from "@gold-insights/market-domain";
import { AssetChartCard } from "../asset-chart-card";
import {
  buildWatchlistSummary,
  getTopWatchlistEvents,
  getWatchlistAssetIds,
  getWatchlistItems,
  trendTone
} from "./watchlist-section.utils";
import "./watchlist-section.css";

type WatchlistSectionProps = {
  watchlists: WatchlistSummary[];
  chartItems: ChartWallItem[];
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
  onRemove(assetId: string): void;
  onShowAll(): void;
};

export function WatchlistSection({ watchlists, chartItems, onSelect, onCompare, onRemove, onShowAll }: WatchlistSectionProps): JSX.Element {
  const watchlistAssetIds = getWatchlistAssetIds(watchlists);
  const items = getWatchlistItems(chartItems, watchlistAssetIds);
  const summary = buildWatchlistSummary(items, watchlistAssetIds.size);
  const events = getTopWatchlistEvents(items);
  const hasHiddenItems = summary.hiddenByFilters > 0;

  return (
    <section className="single-view-section watchlist-section">
      <div className="section-title-row">
        <div>
          <h2>自选图表墙</h2>
          <p>{`${summary.visibleItems}/${summary.totalPinned} 个自选资产在当前筛选下可见`}</p>
        </div>
        {hasHiddenItems && (
          <Button type="button" variant="ghost" className="watchlist-section__show-all" onClick={onShowAll}>
            <FilterX size={15} aria-hidden="true" />
            显示全部自选
          </Button>
        )}
      </div>

      {summary.totalPinned === 0 ? (
        <EmptyState title="自选为空" description="在图表卡片或行情表上点击自选即可加入。" />
      ) : (
        <>
          <div className="watchlist-summary-grid" aria-label="自选摘要">
            <WatchlistSummaryCard label="全部自选" value={summary.totalPinned} description="本地观察池" />
            <WatchlistSummaryCard label="当前可见" value={summary.visibleItems} description={summary.hiddenByFilters > 0 ? `${summary.hiddenByFilters} 个被筛选隐藏` : "未被筛选隐藏"} />
            <WatchlistSummaryCard label="区间上涨" value={summary.positiveItems} description="当前图表区间" />
            <WatchlistSummaryCard label="强趋势" value={summary.strongTrendItems} description="趋势分 >= 60" />
            <WatchlistSummaryCard label="有事件" value={summary.eventfulItems} description="扫描事件提醒" />
          </div>

          <div className="watchlist-meta" aria-label="自选列表">
            {watchlists.map((watchlist) => (
              <span key={watchlist.id}>{watchlist.name}: {watchlist.assets.length}</span>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="watchlist-filter-recovery">
              <EmptyState title="当前筛选下没有自选资产" description="自选资产存在，但被当前市场、品种、层级或搜索条件过滤掉了。" />
              <Button type="button" onClick={onShowAll}>
                <FilterX size={15} aria-hidden="true" />
                显示全部自选
              </Button>
            </div>
          ) : (
            <>
              {events.length > 0 && (
                <section className="watchlist-events" aria-label="自选事件提醒">
                  <header>
                    <h3>事件提醒</h3>
                    <span>{events.length}</span>
                  </header>
                  <div className="watchlist-event-list">
                    {events.map((event) => (
                      <button key={event.id} type="button" className="watchlist-event-card" onClick={() => onSelect(event.assetId)}>
                        <span>
                          <strong>{event.assetName}</strong>
                          <small>{event.symbol}</small>
                        </span>
                        <span>
                          <b>{event.title}</b>
                          <small>{event.summary}</small>
                        </span>
                        <SignalBadge label={`${event.severity}`} tone={event.severity >= 80 ? "amber" : "blue"} />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="chart-wall-grid">
                {items.map((item) => (
                  <AssetChartCard key={item.id} item={item} onSelect={onSelect} onPin={onRemove} onCompare={onCompare} />
                ))}
              </div>

              <div className="watchlist-table-wrapper">
                <table className="watchlist-table">
                  <thead>
                    <tr>
                      <th>资产</th>
                      <th>市场</th>
                      <th>区间涨幅</th>
                      <th>趋势</th>
                      <th>事件</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} onClick={() => onSelect(item.id)}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.symbol}</small>
                        </td>
                        <td><SignalBadge label={item.market} tone="blue" /></td>
                        <td><PriceChange value={item.returnPct} /></td>
                        <td><SignalBadge label={`${item.trendScore} / ${item.trendLabel}`} tone={trendTone(item.trendScore)} /></td>
                        <td><SignalBadge label={`${item.events.length}`} tone={item.events.length > 0 ? "amber" : "neutral"} /></td>
                        <td>
                          <div className="watchlist-table__actions">
                            <Button variant="ghost" onClick={(event) => {
                              event.stopPropagation();
                              onCompare(item.id);
                            }}>
                              <GitCompare size={14} aria-hidden="true" />
                              {item.isCompared ? "取消对比" : "对比"}
                            </Button>
                            <Button variant="ghost" onClick={(event) => {
                              event.stopPropagation();
                              onRemove(item.id);
                            }}>
                              <PinOff size={14} aria-hidden="true" />
                              移除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function WatchlistSummaryCard({ label, value, description }: { label: string; value: number; description: string }): JSX.Element {
  return (
    <article className="watchlist-summary-card">
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
      <small>{description}</small>
    </article>
  );
}
