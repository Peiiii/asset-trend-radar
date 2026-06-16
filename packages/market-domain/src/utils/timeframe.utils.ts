import type { Timeframe } from "../types/bar.types";

export const dayMs = 24 * 60 * 60 * 1000;

export const getRangePointLimit = (range: string): number => {
  switch (range) {
    case "1d":
      return 2;
    case "1w":
      return 8;
    case "1m":
      return 31;
    case "3m":
      return 93;
    case "6m":
      return 186;
    case "1y":
      return 365;
    case "3y":
      return 756;
    case "5y":
      return 1260;
    default:
      return 180;
  }
};

export const getRangeCalendarDayEstimate = (range: string): number => {
  switch (range) {
    case "1d":
      return 1;
    case "1w":
      return 7;
    case "1m":
      return 31;
    case "3m":
      return 93;
    case "6m":
      return 186;
    case "1y":
      return 366;
    case "3y":
      return 1098;
    case "5y":
      return 1830;
    default:
      return 186;
  }
};

export const getRangeMonthEstimate = (range: string): number => {
  switch (range) {
    case "1m":
      return 1;
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "1y":
      return 12;
    case "3y":
      return 36;
    case "5y":
      return 60;
    default:
      return Math.ceil(getRangeCalendarDayEstimate(range) / 31);
  }
};

export const getRangeFetchLimit = (range: string, timeframe: Timeframe): number => {
  const calendarDays = getRangeCalendarDayEstimate(range);
  const indicatorWarmup = timeframe === "1d" ? 0 : 220;

  switch (timeframe) {
    case "15m":
      return Math.max(getRangePointLimit(range), calendarDays * 96 + indicatorWarmup);
    case "1h":
      return Math.max(getRangePointLimit(range), calendarDays * 24 + indicatorWarmup);
    case "4h":
      return Math.max(getRangePointLimit(range), calendarDays * 6 + indicatorWarmup);
    case "1w":
      return Math.max(getRangePointLimit(range), Math.ceil(calendarDays / 7) + 8 + indicatorWarmup);
    case "1mo":
      return Math.max(getRangePointLimit(range), getRangeMonthEstimate(range) + 4 + indicatorWarmup);
    case "1d":
    default:
      return Math.max(getRangePointLimit(range), Math.ceil(calendarDays * 1.8) + 10);
  }
};

export const getRangeStartTimestamp = (anchorTs: number, range: string): number => {
  const anchor = new Date(anchorTs);

  switch (range) {
    case "1d":
      return Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - 1, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds());
    case "1w":
      return Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - 7, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds());
    case "1m":
      return subtractUtcMonths(anchor, 1);
    case "3m":
      return subtractUtcMonths(anchor, 3);
    case "6m":
      return subtractUtcMonths(anchor, 6);
    case "1y":
      return subtractUtcMonths(anchor, 12);
    case "3y":
      return subtractUtcMonths(anchor, 36);
    case "5y":
      return subtractUtcMonths(anchor, 60);
    default:
      return subtractUtcMonths(anchor, 6);
  }
};

export const filterByCalendarRange = <T extends { ts: number }>(items: T[], range: string): T[] => {
  const latest = items.at(-1);

  if (!latest) {
    return [];
  }

  const startTs = getRangeStartTimestamp(latest.ts, range);
  return items.filter((item) => item.ts >= startTs && item.ts <= latest.ts);
};

export const toIsoDateTime = (timestamp: number | null): string | null => {
  if (timestamp === null) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

const subtractUtcMonths = (anchor: Date, months: number): number => {
  const target = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - months, 1, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds()));
  const lastDayOfTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchor.getUTCDate(), lastDayOfTargetMonth));
  return target.getTime();
};
