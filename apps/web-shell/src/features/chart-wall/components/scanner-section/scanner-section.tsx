import { Activity, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { EmptyState, FilterChip, Select, SignalBadge } from "@gold-insights/ui";
import type { ScannerEventsResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { ScannerEventRow } from "./scanner-event-row";
import { scannerEventOptions, severityOptions } from "./scanner-section.options";
import { buildMarketOptions, buildScannerSummary, compareScannerEvents, eventMatchesQuery, eventTone, eventTypeLabel, severityTone, withEventCounts } from "./scanner-section.utils";
import "./scanner-section.css";

type ScannerSectionProps = {
  scannerEvents: ScannerEventsResponse;
  eventType: string;
  minSeverity: string;
  market: string;
  query: string;
  onEventTypeChange(value: string): void;
  onMinSeverityChange(value: string): void;
  onMarketChange(value: string): void;
  onQueryChange(value: string): void;
  onSelectAsset(assetId: string): void;
};

export function ScannerSection({
  scannerEvents,
  eventType,
  minSeverity,
  market,
  query,
  onEventTypeChange,
  onMinSeverityChange,
  onMarketChange,
  onQueryChange,
  onSelectAsset
}: ScannerSectionProps): JSX.Element {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const minSeverityValue = Number(minSeverity);
  const events = scannerEvents.events;
  const sortedEvents = useMemo(() => [...events].sort(compareScannerEvents), [events]);
  const marketOptions = useMemo(() => buildMarketOptions(events), [events]);
  const eventOptions = useMemo(() => withEventCounts(scannerEventOptions, events), [events]);
  const filteredEvents = useMemo(() => sortedEvents.filter((event) => {
    const matchesEventType = eventType === "all" || event.eventType === eventType;
    const matchesSeverity = event.severity >= minSeverityValue;
    const matchesMarket = market === "all" || event.asset?.market === market;
    const matchesQuery = normalizedQuery.length === 0 || eventMatchesQuery(event, normalizedQuery);

    return matchesEventType && matchesSeverity && matchesMarket && matchesQuery;
  }), [eventType, market, minSeverityValue, normalizedQuery, sortedEvents]);
  const summary = useMemo(() => buildScannerSummary(events, filteredEvents), [events, filteredEvents]);
  const priorityEvents = filteredEvents.slice(0, 3);

  return (
    <section className="single-view-section scanner-section">
      <div className="section-title-row">
        <div>
          <h2>机会扫描</h2>
          <p>{`${filteredEvents.length}/${events.length} 个真实数据触发事件，按强度与触发时间优先展示`}</p>
        </div>
        <span className="live-status">
          <Activity size={14} aria-hidden="true" />
          {formatDateTime(scannerEvents.generatedAt)}
        </span>
      </div>

      <div className="scanner-summary-grid" aria-label="扫描摘要">
        {summary.map((item) => (
          <article key={item.label} className="scanner-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.description}</small>
          </article>
        ))}
      </div>

      <div className="scanner-toolbar" aria-label="机会扫描筛选">
        <label className="scanner-search-control" aria-label="搜索机会事件">
          <Search size={16} aria-hidden="true" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索资产、代码或事件说明" />
        </label>
        <Select id="scanner-event-type" label="事件" value={eventType} onChange={onEventTypeChange} options={eventOptions} />
        <Select id="scanner-market" label="市场" value={market} onChange={onMarketChange} options={marketOptions} />
        <Select id="scanner-severity" label="强度" value={minSeverity} onChange={onMinSeverityChange} options={severityOptions} />
      </div>

      <div className="scanner-filter-strip" aria-label="当前扫描筛选">
        <FilterChip label={`命中 ${filteredEvents.length}`} />
        {eventType !== "all" && <FilterChip label={`事件: ${eventTypeLabel(eventType)}`} onClick={() => onEventTypeChange("all")} />}
        {market !== "all" && <FilterChip label={`市场: ${market}`} onClick={() => onMarketChange("all")} />}
        {minSeverity !== "0" && <FilterChip label={`强度 >= ${minSeverity}`} onClick={() => onMinSeverityChange("0")} />}
        {query.trim().length > 0 && <FilterChip label={`搜索: ${query.trim()}`} onClick={() => onQueryChange("")} />}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState title="暂无机会事件" description="当前真实行情没有触发所选扫描规则，可以放宽强度、市场或关键词。" />
      ) : (
        <>
          <div className="scanner-priority-grid" aria-label="优先机会">
            {priorityEvents.map((event) => (
              <button key={event.id} type="button" className="scanner-priority-card" onClick={() => onSelectAsset(event.assetId)}>
                <span className="scanner-priority-card__eyebrow">
                  <Sparkles size={14} aria-hidden="true" />
                  优先机会
                </span>
                <strong>{event.asset?.name ?? event.asset?.symbol ?? event.assetId}</strong>
                <small>{event.asset?.symbol ?? event.assetId}</small>
                <div className="scanner-priority-card__badges">
                  <SignalBadge label={eventTypeLabel(event.eventType)} tone={eventTone(event.eventType)} />
                  <SignalBadge label={`强度 ${event.severity}`} tone={severityTone(event.severity)} />
                </div>
                <p>{event.summary}</p>
              </button>
            ))}
          </div>

          <div className="scanner-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>资产</th>
                  <th>市场</th>
                  <th>事件</th>
                  <th>强度</th>
                  <th>触发时间</th>
                  <th>说明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <ScannerEventRow key={event.id} event={event} onSelectAsset={onSelectAsset} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
