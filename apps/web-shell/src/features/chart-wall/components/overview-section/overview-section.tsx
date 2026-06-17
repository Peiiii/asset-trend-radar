import type { ChartWallItem, ChartWallSortOrder, ScannerEventsResponse } from "@gold-insights/market-domain";
import { EmptyState } from "@gold-insights/ui";
import type { ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { BreadthStrip, SummaryStrip } from "../dashboard-strips";
import { MarketPulseBoard } from "../market-pulse-board/market-pulse-board";
import { OpportunityLeaderboard } from "../opportunity-leaderboard/opportunity-leaderboard";
import { SortAwareMoversStrip } from "../sort-aware-movers-strip/sort-aware-movers-strip";
import "./overview-section.css";

type OverviewSectionProps = {
  data: ChartWallPageData;
  items: ChartWallItem[];
  visibleSearchCount: number;
  market: string;
  sort: string;
  order: ChartWallSortOrder;
  onMarketSelect(market: string): void;
  onSelectAsset(assetId: string): void;
  onCompare(assetId: string): void;
};

export function OverviewSection({ data, items, visibleSearchCount, market, sort, order, onMarketSelect, onSelectAsset, onCompare }: OverviewSectionProps): JSX.Element {
  return (
    <section className="overview-section" aria-label="市场概览">
      <OverviewHeading generatedAt={data.chartWall.generatedAt} />
      <SummaryStrip data={data} visibleSearchCount={visibleSearchCount} />
      <BreadthStrip data={data} />
      <MarketPulseBoard items={items} activeMarket={market} onMarketSelect={onMarketSelect} />
      <SortAwareMoversStrip items={items} sort={sort} order={order} onSelect={onSelectAsset} onCompare={onCompare} />
      <OpportunityLeaderboard items={items} onSelect={onSelectAsset} onCompare={onCompare} />
      <EventListSection events={data.scannerEvents.events.slice(0, 12)} />
    </section>
  );
}

function OverviewHeading({ generatedAt }: { generatedAt: string }): JSX.Element {
  return (
    <div className="overview-section__heading">
      <div>
        <h2>市场概况</h2>
        <p>基于当前筛选口径，把市场宽度、板块强弱、排序异动和核心机会聚合到一页。</p>
      </div>
      <span>更新 {formatDateTime(generatedAt)}</span>
    </div>
  );
}

function EventListSection({ events }: { events: ScannerEventsResponse["events"] }): JSX.Element {
  return (
    <section className="overview-event-section" aria-label="机会事件">
      <div className="overview-section__heading">
        <div>
          <h2>机会事件</h2>
          <p>MACD、突破、多周期共振等扫描事件，用来发现值得进一步打开详情的资产。</p>
        </div>
        <span>{events.length.toLocaleString("en-US")} 条</span>
      </div>
      {events.length === 0 ? (
        <EmptyState title="暂无事件" description="当前筛选结果没有触发突破或 MACD 事件。" />
      ) : (
        <div className="overview-event-list">
          {events.map((event) => (
            <article key={event.id} className="event-card">
              <div>
                <strong>{event.asset?.name ?? event.asset?.symbol ?? event.assetId}</strong>
                <span>{event.severity}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
