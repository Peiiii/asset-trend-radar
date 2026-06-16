import type { OhlcvBar } from "@gold-insights/market-domain";

export const getBreakoutState = (bars: OhlcvBar[]): string => {
  const latest = bars.at(-1);
  const previous = bars.slice(-61, -1);

  if (!latest || previous.length < 20) {
    return "insufficient-data";
  }

  const previous20High = Math.max(...previous.slice(-20).map((bar) => bar.high));
  const previous60High = previous.length >= 60 ? Math.max(...previous.map((bar) => bar.high)) : previous20High;

  if (latest.close >= previous60High) {
    return "breakout-60d";
  }

  if (latest.close >= previous20High) {
    return "breakout-20d";
  }

  return "none";
};
