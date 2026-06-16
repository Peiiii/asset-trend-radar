import { Activity, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Button, EmptyState, FilterChip, Select, SignalBadge } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import type { ScannerEventsResponse, ScannerEventType } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import "./scanner-section.css";

type ScannerEventWithAsset = ScannerEventsResponse["events"][number];

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

const scannerEventOptions: ControlOption[] = [
  { value: "all", label: "全部事件" },
  { value: "macd_golden_cross", label: "MACD 金叉", description: "动能转强" },
  { value: "macd_dead_cross", label: "MACD 死叉", description: "动能转弱" },
  { value: "price_breakout_20d", label: "20D 突破", description: "短线新高" },
  { value: "price_breakout_60d", label: "60D 突破", description: "中期新高" },
  { value: "price_breakout_120d", label: "120D 突破", description: "长期新高" },
  { value: "ma20_reclaim", label: "收复 MA20" },
  { value: "ma50_reclaim", label: "收复 MA50" },
  { value: "ma200_reclaim", label: "收复 MA200" },
  { value: "multi_timeframe_alignment", label: "多周期共振" },
  { value: "relative_strength_leader", label: "相对强势" },
  { value: "sector_leader_confirmed", label: "板块龙头确认" },
  { value: "volume_breakout", label: "量能放大" },
  { value: "volatility_squeeze_breakout", label: "波动收敛突破" },
  { value: "bearish_macd_divergence", label: "MACD 顶背离" },
  { value: "bullish_macd_divergence", label: "MACD 底背离" }
];

const severityOptions: ControlOption[] = [
  { value: "0", label: "全部强度" },
  { value: "40", label: ">= 40", description: "过滤低置信事件" },
  { value: "60", label: ">= 60", description: "重点关注" },
  { value: "80", label: ">= 80", description: "高优先级" }
];

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

function ScannerEventRow({ event, onSelectAsset }: { event: ScannerEventWithAsset; onSelectAsset(assetId: string): void }): JSX.Element {
  return (
    <tr onClick={() => onSelectAsset(event.assetId)}>
      <td>
        <strong>{event.asset?.name ?? event.asset?.symbol ?? event.assetId}</strong>
        <small>{event.asset?.symbol ?? event.assetId}</small>
      </td>
      <td>
        <SignalBadge label={event.asset?.market ?? "-"} tone={marketTone(event.asset?.market)} />
      </td>
      <td>
        <SignalBadge label={eventTypeLabel(event.eventType)} tone={eventTone(event.eventType)} />
      </td>
      <td>
        <SignalBadge label={`${event.severity}`} tone={severityTone(event.severity)} />
      </td>
      <td>{formatEventTime(event.triggeredAt)}</td>
      <td>{event.summary}</td>
      <td>
        <Button variant="ghost" className="scanner-open-button" onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelectAsset(event.assetId);
        }}>
          <ArrowUpRight size={14} aria-hidden="true" />
          查看
        </Button>
      </td>
    </tr>
  );
}

function buildMarketOptions(events: ScannerEventWithAsset[]): ControlOption[] {
  const counts = events.reduce<Map<string, number>>((accumulator, event) => {
    const market = event.asset?.market;
    if (!market) {
      return accumulator;
    }

    accumulator.set(market, (accumulator.get(market) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return [
    { value: "all", label: "全部市场", count: events.length },
    ...[...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([value, count]) => ({ value, label: value, count }))
  ];
}

function withEventCounts(options: ControlOption[], events: ScannerEventWithAsset[]): ControlOption[] {
  const counts = events.reduce<Map<string, number>>((accumulator, event) => {
    accumulator.set(event.eventType, (accumulator.get(event.eventType) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return options.map((option) => ({
    ...option,
    count: option.value === "all" ? events.length : (counts.get(option.value) ?? 0)
  }));
}

function buildScannerSummary(events: ScannerEventWithAsset[], filteredEvents: ScannerEventWithAsset[]): Array<{ label: string; value: string; description: string }> {
  const assetCount = new Set(events.map((event) => event.assetId)).size;
  const highSeverityCount = events.filter((event) => event.severity >= 80).length;
  const filteredHighSeverityCount = filteredEvents.filter((event) => event.severity >= 80).length;
  const macdCount = events.filter((event) => event.eventType.includes("macd")).length;
  const breakoutCount = events.filter((event) => event.eventType.includes("breakout")).length;

  return [
    { label: "当前命中", value: filteredEvents.length.toLocaleString("en-US"), description: "符合当前筛选" },
    { label: "覆盖资产", value: assetCount.toLocaleString("en-US"), description: "至少触发过一次事件" },
    { label: "高强度", value: filteredHighSeverityCount.toLocaleString("en-US"), description: `全量 ${highSeverityCount.toLocaleString("en-US")} 个` },
    { label: "MACD", value: macdCount.toLocaleString("en-US"), description: "动能类信号" },
    { label: "突破", value: breakoutCount.toLocaleString("en-US"), description: "价格或波动突破" }
  ];
}

function compareScannerEvents(left: ScannerEventWithAsset, right: ScannerEventWithAsset): number {
  return right.severity - left.severity || right.triggeredAt - left.triggeredAt || left.id.localeCompare(right.id);
}

function eventMatchesQuery(event: ScannerEventWithAsset, normalizedQuery: string): boolean {
  const fields = [
    event.asset?.name,
    event.asset?.symbol,
    event.asset?.market,
    event.title,
    event.summary,
    eventTypeLabel(event.eventType)
  ];

  return fields.some((field) => field?.toLocaleLowerCase().includes(normalizedQuery));
}

function eventTypeLabel(value: string): string {
  return scannerEventOptions.find((option) => option.value === value)?.label ?? value;
}

function eventTone(eventType: ScannerEventType): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (eventType.includes("dead") || eventType.includes("bearish")) {
    return "negative";
  }

  if (eventType.includes("golden") || eventType.includes("bullish") || eventType.includes("reclaim")) {
    return "positive";
  }

  if (eventType.includes("breakout")) {
    return "blue";
  }

  if (eventType.includes("leader") || eventType.includes("alignment")) {
    return "amber";
  }

  return "neutral";
}

function severityTone(severity: number): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (severity >= 80) {
    return "amber";
  }

  if (severity >= 60) {
    return "blue";
  }

  if (severity >= 40) {
    return "neutral";
  }

  return "neutral";
}

function marketTone(market: string | undefined): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (market === "加密" || market === "商品") {
    return "amber";
  }

  if (market === "基金" || market === "A 股") {
    return "blue";
  }

  return "neutral";
}

function formatEventTime(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
