import type { AssetSummary, AssetValuationStatus, ChartWallFacet, ChartWallFacets, ChartWallItem, DataQualityStatus } from "@gold-insights/market-domain";
import { getAssetValuationStatus, getDataQualityStatus } from "@gold-insights/market-domain";
import { getAssetLevelLabel, getAssetTypeLabel } from "../utils/asset-label.utils";

export class ChartWallFacetBuilderService {
  public buildFacets = (assets: AssetSummary[], items: ChartWallItem[]): ChartWallFacets => ({
    markets: this.buildMarketFacets(assets),
    assetTypes: this.buildAssetTypeFacets(assets),
    levels: this.buildLevelFacets(assets),
    tags: this.buildTagFacets(assets),
    sources: this.buildSourceFacets(assets),
    signals: this.buildSignalFacets(items),
    dataQualities: this.buildDataQualityFacets(items),
    valuationStatuses: this.buildValuationStatusFacets(items)
  });

  public buildMarketFacets = (assets: AssetSummary[]): ChartWallFacet[] => this.withAllFacet("全部市场", assets.length, this.toFacetCounts(assets, (asset) => asset.market));

  public buildAssetTypeFacets = (assets: AssetSummary[]): ChartWallFacet[] =>
    this.withAllFacet("全部品种", assets.length, this.toFacetCounts(assets, (asset) => asset.assetType, getAssetTypeLabel));

  public buildLevelFacets = (assets: AssetSummary[]): ChartWallFacet[] =>
    this.withAllFacet("全部层级", assets.length, this.toFacetCounts(assets, (asset) => asset.level ?? "instrument", getAssetLevelLabel));

  public buildTagFacets = (assets: AssetSummary[]): ChartWallFacet[] => this.withAllFacet("全部主题", assets.length, this.toTagFacetCounts(assets));

  public buildSourceFacets = (assets: AssetSummary[]): ChartWallFacet[] =>
    this.withAllFacet("全部来源", assets.length, this.toFacetCounts(assets, (asset) => asset.dataSource ?? "unknown"));

  public buildSignalFacets = (items: ChartWallItem[]): ChartWallFacet[] => [
    { value: "all", label: "全部信号", count: items.length },
    { value: "strong", label: "强趋势", count: this.applySignalFilter(items, "strong").length },
    { value: "weak", label: "偏弱", count: this.applySignalFilter(items, "weak").length },
    { value: "positive", label: "区间上涨", count: this.applySignalFilter(items, "positive").length },
    { value: "negative", label: "区间下跌", count: this.applySignalFilter(items, "negative").length },
    { value: "macd_golden_cross", label: "MACD 金叉", count: this.applySignalFilter(items, "macd_golden_cross").length },
    { value: "macd_dead_cross", label: "MACD 死叉", count: this.applySignalFilter(items, "macd_dead_cross").length },
    { value: "breakout", label: "价格突破", count: this.applySignalFilter(items, "breakout").length },
    { value: "volume_breakout", label: "量能放大", count: this.applySignalFilter(items, "volume_breakout").length },
    { value: "eventful", label: "有扫描事件", count: this.applySignalFilter(items, "eventful").length },
    { value: "pinned", label: "已自选", count: this.applySignalFilter(items, "pinned").length },
    { value: "data_fresh", label: "数据新鲜", count: this.applySignalFilter(items, "data_fresh").length },
    { value: "data_thin", label: "样本较少", count: this.applySignalFilter(items, "data_thin").length },
    { value: "data_lagged", label: "数据滞后", count: this.applySignalFilter(items, "data_lagged").length }
  ];

  public buildDataQualityFacets = (items: ChartWallItem[]): ChartWallFacets["dataQualities"] => {
    const referenceTimestamp = Date.now();
    const counts = items.reduce((entries, item) => {
      const status = getDataQualityStatus(item, referenceTimestamp);
      entries.set(status, (entries.get(status) ?? 0) + 1);
      return entries;
    }, new Map<DataQualityStatus, number>());

    return [
      { value: "all", label: "全部数据", count: items.length },
      { value: "fresh", label: "数据新鲜", count: counts.get("fresh") ?? 0 },
      { value: "thin", label: "样本较少", count: counts.get("thin") ?? 0 },
      { value: "lagged", label: "数据滞后", count: counts.get("lagged") ?? 0 },
      { value: "missing", label: "缺少数据", count: counts.get("missing") ?? 0 },
      { value: "unknown", label: "状态未知", count: counts.get("unknown") ?? 0 }
    ];
  };

  public buildValuationStatusFacets = (items: ChartWallItem[]): ChartWallFacets["valuationStatuses"] => {
    const counts = items.reduce((entries, item) => {
      const status = getAssetValuationStatus(item.valuation, { assetType: item.assetType });
      entries.set(status, (entries.get(status) ?? 0) + 1);
      return entries;
    }, new Map<AssetValuationStatus, number>());

    return [
      { value: "all", label: "全部规模", count: items.length },
      { value: "available", label: "有市值", count: counts.get("available") ?? 0 },
      { value: "turnover_only", label: "仅成交额", count: counts.get("turnover_only") ?? 0 },
      { value: "source_missing_value", label: "源缺值", count: counts.get("source_missing_value") ?? 0 },
      { value: "source_unavailable", label: "未覆盖", count: counts.get("source_unavailable") ?? 0 },
      { value: "not_applicable", label: "不适用", count: counts.get("not_applicable") ?? 0 }
    ];
  };

  public applySignalFilter = (items: ChartWallItem[], signal: string): ChartWallItem[] => {
    const referenceTimestamp = Date.now();

    switch (signal) {
      case "strong":
        return items.filter((item) => item.trendScore >= 30);
      case "weak":
        return items.filter((item) => item.trendScore <= -10);
      case "positive":
        return items.filter((item) => (item.returnPct ?? 0) > 0);
      case "negative":
        return items.filter((item) => (item.returnPct ?? 0) < 0);
      case "macd_golden_cross":
        return items.filter((item) => item.macdState === "bullish-cross");
      case "macd_dead_cross":
        return items.filter((item) => item.macdState === "bearish-cross");
      case "breakout":
        return items.filter((item) => item.breakoutState.startsWith("breakout"));
      case "volume_breakout":
        return items.filter((item) => (item.volumeRatio ?? 0) >= 1.5);
      case "eventful":
        return items.filter((item) => item.events.length > 0);
      case "pinned":
        return items.filter((item) => item.isPinned);
      case "data_fresh":
        return items.filter((item) => getDataQualityStatus(item, referenceTimestamp) === "fresh");
      case "data_thin":
        return items.filter((item) => getDataQualityStatus(item, referenceTimestamp) === "thin");
      case "data_lagged":
        return items.filter((item) => ["lagged", "missing", "unknown"].includes(getDataQualityStatus(item, referenceTimestamp)));
      case "all":
      default:
        return items;
    }
  };

  private toFacetCounts = <TItem,>(items: TItem[], getValue: (item: TItem) => string, getLabel: (value: string) => string = (value) => value): ChartWallFacet[] => {
    const counts = new Map<string, number>();

    for (const item of items) {
      const value = getValue(item);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: getLabel(value),
        count
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
  };

  private withAllFacet = (label: string, count: number, facets: ChartWallFacet[]): ChartWallFacet[] => [{ value: "all", label, count }, ...facets];

  private toTagFacetCounts = (assets: AssetSummary[]): ChartWallFacet[] => {
    const counts = new Map<string, number>();

    for (const asset of assets) {
      for (const tag of asset.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
  };

}
