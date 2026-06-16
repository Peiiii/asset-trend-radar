import type { ControlOption } from "@gold-insights/ui";

export const scannerEventOptions: ControlOption[] = [
  { value: "all", label: "全部事件" },
  { value: "macd_golden_cross", label: "MACD 金叉", description: "动能转强" },
  { value: "macd_dead_cross", label: "MACD 死叉", description: "动能转弱" },
  { value: "price_breakout_20d", label: "20D 突破", description: "短线新高" },
  { value: "price_breakout_60d", label: "60D 突破", description: "中期新高" },
  { value: "price_breakout_120d", label: "120D 突破", description: "长期新高" },
  { value: "ma20_reclaim", label: "收复 MA20" },
  { value: "ma50_reclaim", label: "收复 MA50" },
  { value: "ma200_reclaim", label: "收复 MA200" },
  { value: "multi_timeframe_alignment", label: "多周期共振" },
  { value: "relative_strength_leader", label: "相对强势" },
  { value: "sector_leader_confirmed", label: "板块龙头确认" },
  { value: "volume_breakout", label: "量能放大" },
  { value: "volatility_squeeze_breakout", label: "波动收敛突破" },
  { value: "bearish_macd_divergence", label: "MACD 顶背离" },
  { value: "bullish_macd_divergence", label: "MACD 底背离" }
];

export const severityOptions: ControlOption[] = [
  { value: "0", label: "全部强度" },
  { value: "40", label: ">= 40", description: "过滤低置信事件" },
  { value: "60", label: ">= 60", description: "重点关注" },
  { value: "80", label: ">= 80", description: "高优先级" }
];
