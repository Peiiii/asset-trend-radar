export type MacdState = "bullish-cross" | "bearish-cross" | "above-zero" | "below-zero" | "neutral";

export type IndicatorPoint = {
  assetId: string;
  timeframe: string;
  ts: number;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macdDif: number | null;
  macdDea: number | null;
  macdHist: number | null;
  rsi14: number | null;
};

export type TrendSnapshot = {
  assetId: string;
  timeframe: string;
  ts: number;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  trendScore: number;
  relativeStrengthRank: number | null;
  macdState: MacdState;
  breakoutState: string;
  volumeState: string;
};
