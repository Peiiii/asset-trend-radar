import type { ChartWallItem } from "@gold-insights/market-domain";

export type OpportunityDigestTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type OpportunityDigestAction =
  | { kind: "asset"; assetId: string }
  | { kind: "market"; market: string }
  | { kind: "none" };

export type OpportunityDigestCard = {
  key: "market" | "leader" | "activity" | "risk";
  title: string;
  label: string;
  value: string;
  description: string;
  tone: OpportunityDigestTone;
  metricLabel: string;
  metricValue: string;
  metricTone: OpportunityDigestTone;
  action: OpportunityDigestAction;
  compareAssetId: string | null;
};

type MarketStats = {
  market: string;
  count: number;
  positiveRatio: number;
  averageReturn1m: number | null;
  averageTrendScore: number | null;
  strongTrendCount: number;
  eventCount: number;
  score: number;
};

export class OpportunityDigestBuilder {
  public build = (items: ChartWallItem[]): OpportunityDigestCard[] => {
    if (items.length === 0) {
      return this.buildEmptyCards();
    }

    return [
      this.buildMarketCard(items),
      this.buildLeaderCard(items),
      this.buildActivityCard(items),
      this.buildRiskCard(items)
    ];
  };

  private buildMarketCard = (items: ChartWallItem[]): OpportunityDigestCard => {
    const stats = this.createMarketStats(items)[0] ?? null;

    if (!stats) {
      return this.emptyCard("market", "主线市场", "暂无市场", "当前筛选没有可聚合的市场。");
    }

    const trendLabel = stats.averageTrendScore === null ? "暂无趋势分" : `趋势分 ${stats.averageTrendScore.toFixed(0)}`;

    return {
      key: "market",
      title: "主线市场",
      label: `${stats.count.toLocaleString("en-US")} 个资产`,
      value: stats.market,
      description: `1M 均值 ${this.formatSignedPercent(stats.averageReturn1m)}，上涨占比 ${Math.round(stats.positiveRatio * 100)}%，${trendLabel}。`,
      tone: stats.averageReturn1m !== null && stats.averageReturn1m < 0 ? "negative" : stats.positiveRatio >= 0.55 ? "positive" : "blue",
      metricLabel: "强趋势",
      metricValue: `${stats.strongTrendCount.toLocaleString("en-US")} 个`,
      metricTone: stats.strongTrendCount > 0 ? "positive" : "neutral",
      action: { kind: "market", market: stats.market },
      compareAssetId: null
    };
  };

  private buildLeaderCard = (items: ChartWallItem[]): OpportunityDigestCard => {
    const leader = this.topByScore(items, this.scoreOpportunity)[0] ?? null;

    if (!leader) {
      return this.emptyCard("leader", "最强资产", "暂无资产", "当前筛选缺少涨幅、趋势或事件数据。");
    }

    return {
      key: "leader",
      title: "最强资产",
      label: `${leader.symbol} / ${leader.market}`,
      value: leader.name,
      description: `1M ${this.formatSignedPercent(leader.return1m)}，3M ${this.formatSignedPercent(leader.return3m)}，趋势分 ${leader.trendScore.toFixed(0)}。`,
      tone: (leader.return1m ?? leader.returnPct ?? 0) >= 0 ? "positive" : "amber",
      metricLabel: "机会分",
      metricValue: this.scoreOpportunity(leader).toFixed(0),
      metricTone: "positive",
      action: { kind: "asset", assetId: leader.id },
      compareAssetId: leader.id
    };
  };

  private buildActivityCard = (items: ChartWallItem[]): OpportunityDigestCard => {
    const activityLeader = this.topByScore(items, this.scoreActivity)[0] ?? null;

    if (!activityLeader || this.scoreActivity(activityLeader) <= 0) {
      return this.emptyCard("activity", "异动线索", "暂无异动", "当前筛选没有明显事件或量能异动。");
    }

    const volumeText = activityLeader.volumeRatio === null ? "量比暂无" : `量比 ${activityLeader.volumeRatio.toFixed(2)}x`;

    return {
      key: "activity",
      title: "异动线索",
      label: `${activityLeader.symbol} / ${activityLeader.market}`,
      value: activityLeader.name,
      description: `${activityLeader.events.length} 条扫描事件，${volumeText}，1D ${this.formatSignedPercent(activityLeader.return1d)}。`,
      tone: activityLeader.events.length > 0 ? "amber" : "blue",
      metricLabel: "事件",
      metricValue: `${activityLeader.events.length.toLocaleString("en-US")} 条`,
      metricTone: activityLeader.events.length > 0 ? "amber" : "neutral",
      action: { kind: "asset", assetId: activityLeader.id },
      compareAssetId: activityLeader.id
    };
  };

  private buildRiskCard = (items: ChartWallItem[]): OpportunityDigestCard => {
    const negativeCount = items.filter((item) => (item.return1m ?? item.returnPct ?? 0) < 0).length;
    const weakTrendCount = items.filter((item) => item.trendScore <= -20).length;
    const negativeRatio = items.length > 0 ? negativeCount / items.length : 0;
    const weakTrendRatio = items.length > 0 ? weakTrendCount / items.length : 0;
    const drawdownLeader = this.topByScore(items, (item) => Math.abs(Math.min(item.drawdownPct ?? 0, 0)))[0] ?? null;

    if (negativeRatio >= 0.45 || weakTrendRatio >= 0.35) {
      return {
        key: "risk",
        title: "风险提示",
        label: `${negativeCount.toLocaleString("en-US")} 个下跌`,
        value: "市场宽度承压",
        description: `当前筛选下跌占比 ${Math.round(negativeRatio * 100)}%，弱趋势占比 ${Math.round(weakTrendRatio * 100)}%。`,
        tone: negativeRatio >= 0.55 || weakTrendRatio >= 0.45 ? "negative" : "amber",
        metricLabel: "弱趋势",
        metricValue: `${weakTrendCount.toLocaleString("en-US")} 个`,
        metricTone: weakTrendCount > 0 ? "negative" : "neutral",
        action: { kind: "none" },
        compareAssetId: null
      };
    }

    if (!drawdownLeader || (drawdownLeader.drawdownPct ?? 0) >= -5) {
      return {
        key: "risk",
        title: "风险提示",
        label: `${items.length.toLocaleString("en-US")} 个资产`,
        value: "暂无明显压力",
        description: "当前筛选没有大面积下跌或显著回撤，仍需结合单资产图形确认。",
        tone: "neutral",
        metricLabel: "下跌",
        metricValue: `${negativeCount.toLocaleString("en-US")} 个`,
        metricTone: negativeCount > 0 ? "amber" : "neutral",
        action: { kind: "none" },
        compareAssetId: null
      };
    }

    return {
      key: "risk",
      title: "风险提示",
      label: `${drawdownLeader.symbol} / ${drawdownLeader.market}`,
      value: drawdownLeader.name,
      description: `当前回撤 ${this.formatSignedPercent(drawdownLeader.drawdownPct)}，1M ${this.formatSignedPercent(drawdownLeader.return1m)}。`,
      tone: "amber",
      metricLabel: "回撤",
      metricValue: this.formatSignedPercent(drawdownLeader.drawdownPct),
      metricTone: "negative",
      action: { kind: "asset", assetId: drawdownLeader.id },
      compareAssetId: drawdownLeader.id
    };
  };

  private createMarketStats = (items: ChartWallItem[]): MarketStats[] => {
    const groups = new Map<string, ChartWallItem[]>();

    for (const item of items) {
      groups.set(item.market, [...(groups.get(item.market) ?? []), item]);
    }

    return [...groups.entries()]
      .map(([market, marketItems]) => {
        const averageReturn1m = this.average(marketItems.map((item) => item.return1m));
        const averageTrendScore = this.average(marketItems.map((item) => item.trendScore));
        const positiveCount = marketItems.filter((item) => (item.return1m ?? item.returnPct ?? 0) > 0).length;
        const strongTrendCount = marketItems.filter((item) => item.trendScore >= 35).length;
        const eventCount = marketItems.reduce((sum, item) => sum + item.events.length, 0);
        const positiveRatio = marketItems.length > 0 ? positiveCount / marketItems.length : 0;
        const strongTrendRatio = marketItems.length > 0 ? strongTrendCount / marketItems.length : 0;
        const eventDensity = marketItems.length > 0 ? eventCount / marketItems.length : 0;

        return {
          market,
          count: marketItems.length,
          positiveRatio,
          averageReturn1m,
          averageTrendScore,
          strongTrendCount,
          eventCount,
          score: (averageReturn1m ?? 0) * 1.1 + (averageTrendScore ?? 0) * 0.35 + positiveRatio * 35 + strongTrendRatio * 25 + eventDensity * 4
        };
      })
      .sort((left, right) => right.score - left.score);
  };

  private topByScore = (items: ChartWallItem[], getScore: (item: ChartWallItem) => number): ChartWallItem[] =>
    [...items]
      .map((item) => ({ item, score: getScore(item) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => right.score - left.score)
      .map(({ item }) => item);

  private scoreOpportunity = (item: ChartWallItem): number =>
    item.trendScore +
    (item.return1m ?? item.returnPct ?? 0) * 1.6 +
    (item.return3m ?? 0) * 0.55 +
    (item.return6m ?? 0) * 0.25 +
    Math.min(item.events.length * 8, 24) +
    Math.min((item.volumeRatio ?? 0) * 6, 18) -
    Math.max(Math.abs(Math.min(item.drawdownPct ?? 0, 0)) - 35, 0) * 0.35;

  private scoreActivity = (item: ChartWallItem): number => {
    const highestSeverity = Math.max(...item.events.map((event) => event.severity), 0);
    return item.events.length * 18 + highestSeverity * 6 + Math.min((item.volumeRatio ?? 0) * 8, 20) + Math.abs(item.return1d ?? 0) * 1.5;
  };

  private buildEmptyCards = (): OpportunityDigestCard[] => [
    this.emptyCard("market", "主线市场", "暂无市场", "当前筛选没有可聚合的市场。"),
    this.emptyCard("leader", "最强资产", "暂无资产", "当前筛选缺少可排名资产。"),
    this.emptyCard("activity", "异动线索", "暂无异动", "当前筛选没有扫描事件或量能异动。"),
    this.emptyCard("risk", "风险提示", "暂无压力", "当前筛选没有可评估的风险数据。")
  ];

  private emptyCard = (key: OpportunityDigestCard["key"], title: string, value: string, description: string): OpportunityDigestCard => ({
    key,
    title,
    label: "当前筛选",
    value,
    description,
    tone: "neutral",
    metricLabel: "状态",
    metricValue: "暂无",
    metricTone: "neutral",
    action: { kind: "none" },
    compareAssetId: null
  });

  private average = (values: Array<number | null | undefined>): number | null => {
    const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
  };

  private formatSignedPercent = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "暂无";
    }

    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };
}
