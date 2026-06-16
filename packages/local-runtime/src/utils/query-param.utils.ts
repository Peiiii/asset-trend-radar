import type { Timeframe } from "@gold-insights/market-domain";

export const getRangeQueryParam = (url: URL): string => url.searchParams.get("range") ?? "6m";

export const getTimeframeQueryParam = (url: URL): Timeframe => {
  const timeframe = url.searchParams.get("timeframe");
  if (timeframe === "15m" || timeframe === "1h" || timeframe === "4h" || timeframe === "1d" || timeframe === "1w" || timeframe === "1mo") {
    return timeframe;
  }

  return "1d";
};

export const getStringQueryParam = (url: URL, name: string, fallback: string): string => url.searchParams.get(name) ?? fallback;

export const getAssetIdsQueryParam = (url: URL): string[] =>
  (url.searchParams.get("assetIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
