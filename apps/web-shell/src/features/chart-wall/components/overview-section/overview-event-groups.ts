import type { ScannerEventsResponse } from "@gold-insights/market-domain";
import { compareScannerEvents } from "../scanner-section/scanner-section.utils";

export type OverviewEvent = ScannerEventsResponse["events"][number];

export type OverviewEventGroup = {
  assetId: string;
  assetName: string;
  assetSymbol: string;
  market: string;
  highestSeverity: number;
  latestTriggeredAt: number;
  primaryEvent: OverviewEvent;
  events: OverviewEvent[];
};

export class OverviewEventGroupBuilder {
  public build = (events: OverviewEvent[], limit: number): OverviewEventGroup[] => {
    const groupedEvents = events.reduce<Map<string, OverviewEvent[]>>((groups, event) => {
      const group = groups.get(event.assetId) ?? [];
      group.push(event);
      groups.set(event.assetId, group);
      return groups;
    }, new Map<string, OverviewEvent[]>());

    return [...groupedEvents.entries()]
      .map(([assetId, groupEvents]) => this.toGroup(assetId, groupEvents))
      .sort(this.compareGroups)
      .slice(0, limit);
  };

  private toGroup = (assetId: string, events: OverviewEvent[]): OverviewEventGroup => {
    const sortedEvents = [...events].sort(compareScannerEvents);
    const primaryEvent = sortedEvents[0] as OverviewEvent;
    const asset = primaryEvent.asset;
    const highestSeverity = sortedEvents.reduce((highest, event) => Math.max(highest, event.severity), 0);
    const latestTriggeredAt = sortedEvents.reduce((latest, event) => Math.max(latest, event.triggeredAt), 0);

    return {
      assetId,
      assetName: asset?.name ?? asset?.symbol ?? assetId,
      assetSymbol: asset?.symbol ?? assetId,
      market: asset?.market ?? "-",
      highestSeverity,
      latestTriggeredAt,
      primaryEvent,
      events: sortedEvents
    };
  };

  private compareGroups = (left: OverviewEventGroup, right: OverviewEventGroup): number =>
    right.highestSeverity - left.highestSeverity
    || right.events.length - left.events.length
    || right.latestTriggeredAt - left.latestTriggeredAt
    || left.assetName.localeCompare(right.assetName);
}
