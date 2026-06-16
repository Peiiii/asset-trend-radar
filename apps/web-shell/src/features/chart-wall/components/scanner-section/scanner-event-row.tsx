import { ArrowUpRight } from "lucide-react";
import { Button, SignalBadge } from "@gold-insights/ui";
import type { ScannerEventWithAsset } from "./scanner-section.types";
import { eventTone, eventTypeLabel, formatEventTime, marketTone, severityTone } from "./scanner-section.utils";

type ScannerEventRowProps = {
  event: ScannerEventWithAsset;
  onSelectAsset(assetId: string): void;
};

export function ScannerEventRow({ event, onSelectAsset }: ScannerEventRowProps): JSX.Element {
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
