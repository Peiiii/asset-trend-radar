import type { IndicatorPoint, OhlcvBar } from "@gold-insights/market-domain";
import { calculateEma } from "./ema.utils";
import { calculateSimpleMovingAverage } from "./moving-average.utils";

export const calculateIndicators = (bars: OhlcvBar[]): IndicatorPoint[] => {
  const closes = bars.map((bar) => bar.close);
  const ma20 = calculateSimpleMovingAverage(closes, 20);
  const ma50 = calculateSimpleMovingAverage(closes, 50);
  const ma200 = calculateSimpleMovingAverage(closes, 200);
  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  const difValues = closes.map((_, index) => {
    const fast = ema12[index];
    const slow = ema26[index];
    return fast === null || slow === null ? null : fast - slow;
  });
  const deaInput = difValues.map((value) => value ?? 0);
  const deaRaw = calculateEma(deaInput, 9);

  return bars.map((bar, index) => {
    const macdDif = difValues[index];
    const macdDea = macdDif === null ? null : deaRaw[index];
    const macdHist = macdDif === null || macdDea === null ? null : macdDif - macdDea;

    return {
      assetId: bar.assetId,
      timeframe: bar.timeframe,
      ts: bar.ts,
      ma20: ma20[index],
      ma50: ma50[index],
      ma200: ma200[index],
      ema12: ema12[index],
      ema26: ema26[index],
      macdDif,
      macdDea,
      macdHist,
      rsi14: null
    };
  });
};
