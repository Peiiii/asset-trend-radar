export type Timeframe = "15m" | "1h" | "4h" | "1d" | "1w" | "1mo";

export type OhlcvBar = {
  assetId: string;
  timeframe: Timeframe;
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  source: string;
};

export type SparklinePoint = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};
