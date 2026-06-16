import type { IndicatorPoint, OhlcvBar, ScannerEvent } from "@gold-insights/market-domain";
import { getBreakoutState } from "../utils/breakout-rule.utils";
import { getMacdState } from "../utils/macd-cross-rule.utils";
import { getReturnPct, getTrendScore } from "../utils/relative-strength-rule.utils";

export class ScannerEngineManager {
  public createEvents = (assetId: string, bars: OhlcvBar[], indicators: IndicatorPoint[]): ScannerEvent[] => {
    const latest = bars.at(-1);

    if (!latest) {
      return [];
    }

    const events: ScannerEvent[] = [];
    const macdState = getMacdState(indicators);
    const breakoutState = getBreakoutState(bars);
    const return1m = getReturnPct(bars, 30);
    const return3m = getReturnPct(bars, 90);

    if (macdState === "bullish-cross") {
      events.push({
        id: `${assetId}-${latest.ts}-macd-golden-cross`,
        assetId,
        timeframe: latest.timeframe,
        eventType: "macd_golden_cross",
        severity: 80,
        title: "MACD 金叉",
        summary: "DIF 上穿 DEA，走势进入可观察状态。",
        evidence: { macdState, close: latest.close },
        triggeredAt: latest.ts
      });
    }

    if (macdState === "bearish-cross") {
      events.push({
        id: `${assetId}-${latest.ts}-macd-dead-cross`,
        assetId,
        timeframe: latest.timeframe,
        eventType: "macd_dead_cross",
        severity: 70,
        title: "MACD 死叉",
        summary: "DIF 下穿 DEA，趋势动能转弱。",
        evidence: { macdState, close: latest.close },
        triggeredAt: latest.ts
      });
    }

    if (breakoutState === "breakout-60d" || breakoutState === "breakout-20d") {
      events.push({
        id: `${assetId}-${latest.ts}-${breakoutState}`,
        assetId,
        timeframe: latest.timeframe,
        eventType: breakoutState === "breakout-60d" ? "price_breakout_60d" : "price_breakout_20d",
        severity: breakoutState === "breakout-60d" ? 85 : 72,
        title: breakoutState === "breakout-60d" ? "突破 60 日高点" : "突破 20 日高点",
        summary: "价格突破近期区间高点，值得进一步观察成交量和相关资产确认。",
        evidence: { breakoutState, close: latest.close },
        triggeredAt: latest.ts
      });
    }

    if ((return1m ?? 0) > 0 && (return3m ?? 0) > 0 && getTrendScore(bars) > 10) {
      events.push({
        id: `${assetId}-${latest.ts}-multi-timeframe-alignment`,
        assetId,
        timeframe: latest.timeframe,
        eventType: "multi_timeframe_alignment",
        severity: 75,
        title: "多周期走势共振",
        summary: "1M 与 3M 收益同向为正，趋势评分处于偏强区间。",
        evidence: { return1m, return3m, trendScore: getTrendScore(bars) },
        triggeredAt: latest.ts
      });
    }

    return events;
  };
}
