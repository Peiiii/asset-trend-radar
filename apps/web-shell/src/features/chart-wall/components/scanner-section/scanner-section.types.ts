import type { ScannerEventsResponse } from "@gold-insights/market-domain";

export type ScannerEventWithAsset = ScannerEventsResponse["events"][number];

export type SignalTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type ScannerSummaryItem = {
  label: string;
  value: string;
  description: string;
};
