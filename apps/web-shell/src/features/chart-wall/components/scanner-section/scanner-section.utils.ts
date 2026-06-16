import type { ControlOption } from "@gold-insights/ui";
import type { ScannerEventType } from "@gold-insights/market-domain";
import { scannerEventOptions } from "./scanner-section.options";
import type { ScannerEventWithAsset, ScannerSummaryItem, SignalTone } from "./scanner-section.types";

export function buildMarketOptions(events: ScannerEventWithAsset[]): ControlOption[] {
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

export function withEventCounts(options: ControlOption[], events: ScannerEventWithAsset[]): ControlOption[] {
  const counts = events.reduce<Map<string, number>>((accumulator, event) => {
    accumulator.set(event.eventType, (accumulator.get(event.eventType) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return options.map((option) => ({
    ...option,
    count: option.value === "all" ? events.length : (counts.get(option.value) ?? 0)
  }));
}

export function buildScannerSummary(events: ScannerEventWithAsset[], filteredEvents: ScannerEventWithAsset[]): ScannerSummaryItem[] {
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

export function compareScannerEvents(left: ScannerEventWithAsset, right: ScannerEventWithAsset): number {
  return right.severity - left.severity || right.triggeredAt - left.triggeredAt || left.id.localeCompare(right.id);
}

export function eventMatchesQuery(event: ScannerEventWithAsset, normalizedQuery: string): boolean {
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

export function eventTypeLabel(value: string): string {
  return scannerEventOptions.find((option) => option.value === value)?.label ?? value;
}

export function eventTone(eventType: ScannerEventType): SignalTone {
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

export function severityTone(severity: number): SignalTone {
  if (severity >= 80) {
    return "amber";
  }

  if (severity >= 60) {
    return "blue";
  }

  return "neutral";
}

export function marketTone(market: string | undefined): SignalTone {
  if (market === "加密" || market === "商品") {
    return "amber";
  }

  if (market === "基金" || market === "A 股") {
    return "blue";
  }

  return "neutral";
}

export function formatEventTime(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
