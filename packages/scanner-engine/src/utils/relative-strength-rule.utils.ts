import type { OhlcvBar } from "@gold-insights/market-domain";

export const getReturnPct = (bars: OhlcvBar[], lookback: number): number | null => {
  if (bars.length < lookback + 1) {
    return null;
  }

  const latest = bars.at(-1);
  const previous = bars.at(-1 - lookback);

  if (!latest || !previous || previous.close === 0) {
    return null;
  }

  return ((latest.close - previous.close) / previous.close) * 100;
};

export const getTrendScore = (bars: OhlcvBar[]): number => {
  const return1m = getReturnPct(bars, 30) ?? 0;
  const return3m = getReturnPct(bars, 90) ?? 0;
  const return6m = getReturnPct(bars, 180) ?? 0;
  return Math.round(return1m * 2 + return3m + return6m * 0.5);
};
