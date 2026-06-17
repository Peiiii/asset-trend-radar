import type { ChartWallSortOrder, Timeframe } from "@gold-insights/market-domain";

export const getRangeQueryParam = (url: URL): string => url.searchParams.get("range") ?? "6m";

export const getTimeframeQueryParam = (url: URL): Timeframe => {
  const timeframe = url.searchParams.get("timeframe");
  if (timeframe === "15m" || timeframe === "1h" || timeframe === "4h" || timeframe === "1d" || timeframe === "1w" || timeframe === "1mo") {
    return timeframe;
  }

  return "1d";
};

export const getStringQueryParam = (url: URL, name: string, fallback: string): string => url.searchParams.get(name) ?? fallback;

export const getBooleanQueryParam = (url: URL, name: string, fallback = false): boolean => {
  const value = url.searchParams.get(name);

  if (value === null) {
    return fallback;
  }

  return value === "1" || value === "true";
};

export const getIntegerQueryParam = (url: URL, name: string, fallback: number, min: number, max: number): number => {
  const value = Number(url.searchParams.get(name));
  return Number.isInteger(value) ? Math.min(Math.max(value, min), max) : fallback;
};

export const getSortOrderQueryParam = (url: URL): ChartWallSortOrder => (url.searchParams.get("order") === "asc" ? "asc" : "desc");

export const getAssetIdsQueryParam = (url: URL): string[] =>
  (url.searchParams.get("assetIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
