import type { IndicatorPoint, MacdState } from "@gold-insights/market-domain";

export const getMacdState = (points: IndicatorPoint[]): MacdState => {
  const latest = points.at(-1);
  const previous = points.at(-2);

  if (!latest || !previous || latest.macdDif === null || latest.macdDea === null || previous.macdDif === null || previous.macdDea === null) {
    return "neutral";
  }

  if (previous.macdDif <= previous.macdDea && latest.macdDif > latest.macdDea) {
    return "bullish-cross";
  }

  if (previous.macdDif >= previous.macdDea && latest.macdDif < latest.macdDea) {
    return "bearish-cross";
  }

  if (latest.macdDif > 0 && latest.macdDea > 0) {
    return "above-zero";
  }

  if (latest.macdDif < 0 && latest.macdDea < 0) {
    return "below-zero";
  }

  return "neutral";
};
