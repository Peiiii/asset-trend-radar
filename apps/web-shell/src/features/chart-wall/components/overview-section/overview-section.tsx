import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { EmptyState, SignalBadge } from "@gold-insights/ui";
import type { ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { BreadthStrip, SummaryStrip } from "../dashboard-strips";
import { MarketPulseBoard } from "../market-pulse-board/market-pulse-board";
import { OpportunityLeaderboard } from "../opportunity-leaderboard/opportunity-leaderboard";
import { eventTone, eventTypeLabel, severityTone } from "../scanner-section/scanner-section.utils";
import { SortAwareMoversStrip } from "../sort-aware-movers-strip/sort-aware-movers-strip";
import { OverviewEventGroupBuilder, type OverviewEventGroup } from "./overview-event-groups";
import "./overview-section.css";

const overviewEventGroupBuilder = new OverviewEventGroupBuilder();

type OverviewSectionProps = {
  data: ChartWallPageData;
  items: ChartWallItem[];
  market: string;
  sort: string;
  order: ChartWallSortOrder;
  onMarketSelect(market: string): void;
  onSelectAsset(assetId: string): void;
  onCompare(assetId: string): void;
};

export function OverviewSection({ data, items, market, sort, order, onMarketSelect, onSelectAsset, onCompare }: OverviewSectionProps): JSX.Element {
  const visibleAssetIds = new Set(items.map((item) => item.id));
  const visibleEvents = data.scannerEvents.events.filter((event) => visibleAssetIds.has(event.assetId));
  const visibleEventGroups = overviewEventGroupBuilder.build(visibleEvents, 12);

  return (
    <section className="overview-section" aria-label="市场概览">
      <OverviewHeading generatedAt={data.chartWall.generatedAt} />
      <SummaryStrip data={data} items={items} />
      <BreadthStrip items={items} />
      <MarketPulseBoard items={items} activeMarket={market} onMarketSelect={onMarketSelect} />
      <SortAwareMoversStrip items={items} sort={sort} order={order} onSelect={onSelectAsset} onCompare={onCompare} />
      <OpportunityLeaderboard items={items} onSelect={onSelectAsset} onCompare={onCompare} />
      <EventListSection groups={visibleEventGroups} eventCount={visibleEvents.length} onSelectAsset={onSelectAsset} />
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

function EventListSection({ groups, eventCount, onSelectAsset }: { groups: OverviewEventGroup[]; eventCount: number; onSelectAsset(assetId: string): void }): JSX.Element {
  return (
    <section className="overview-event-section" aria-label="机会事件">
      <div className="overview-section__heading">
        <div>
          <h2>机会事件</h2>
          <p>MACD、突破、多周期共振等扫描事件，用来发现值得进一步打开详情的资产。</p>
        </div>
        <span>{groups.length.toLocaleString("en-US")} 个资产 / {eventCount.toLocaleString("en-US")} 条事件</span>
      </div>
      {groups.length === 0 ? (
        <EmptyState title="暂无事件" description="当前筛选结果没有触发突破或 MACD 事件。" />
      ) : (
        <div className="overview-event-list">
          {groups.map((group) => (
            <button key={group.assetId} type="button" className="overview-event-card" aria-label={`查看 ${group.assetName} 详情`} onClick={() => onSelectAsset(group.assetId)}>
              <header>
                <span className="overview-event-card__asset">
                  <strong>{group.assetName}</strong>
                  <small>{group.assetSymbol} · {group.market}</small>
                </span>
                <span className="overview-event-card__badges">
                  <SignalBadge label={`强度 ${group.highestSeverity}`} tone={severityTone(group.highestSeverity)} />
                  {group.events.length > 1 && <SignalBadge label={`${group.events.length} 条事件`} tone="amber" />}
                </span>
              </header>
              <div className="overview-event-card__primary">
                <SignalBadge label={eventTypeLabel(group.primaryEvent.eventType)} tone={eventTone(group.primaryEvent.eventType)} />
                <h3>{group.primaryEvent.title}</h3>
              </div>
              <p>{group.primaryEvent.summary}</p>
              {group.events.length > 1 && (
                <ul className="overview-event-card__secondary">
                  {group.events.slice(1, 3).map((event) => (
                    <li key={event.id}>{event.title}</li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
