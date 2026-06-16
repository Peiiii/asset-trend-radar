export type ScannerEventType =
  | "macd_golden_cross"
  | "macd_dead_cross"
  | "price_breakout_20d"
  | "price_breakout_60d"
  | "price_breakout_120d"
  | "ma20_reclaim"
  | "ma50_reclaim"
  | "ma200_reclaim"
  | "multi_timeframe_alignment"
  | "relative_strength_leader"
  | "sector_leader_confirmed"
  | "volume_breakout"
  | "volatility_squeeze_breakout"
  | "bearish_macd_divergence"
  | "bullish_macd_divergence";

export type ScannerEvent = {
  id: string;
  assetId: string;
  timeframe: string;
  eventType: ScannerEventType;
  severity: number;
  title: string;
  summary: string;
  evidence: Record<string, number | string | boolean | null>;
  triggeredAt: number;
};
