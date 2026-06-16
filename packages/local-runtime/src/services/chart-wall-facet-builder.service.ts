import type { AssetSummary, ChartWallFacet, ChartWallFacets, ChartWallItem } from "@gold-insights/market-domain";
import { getDataQualityStatus } from "@gold-insights/market-domain";

export class ChartWallFacetBuilderService {
  public buildFacets = (assets: AssetSummary[], items: ChartWallItem[]): ChartWallFacets => ({
    markets: this.toFacetCounts(assets, (asset) => asset.market),
    assetTypes: this.toFacetCounts(assets, (asset) => asset.assetType, this.getAssetTypeLabel),
    levels: this.toFacetCounts(assets, (asset) => asset.level ?? "instrument", this.getLevelLabel),
    tags: this.toTagFacetCounts(assets),
    sources: this.toFacetCounts(assets, (asset) => asset.dataSource ?? "unknown"),
    signals: [
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
    ]
  });

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

  private getAssetTypeLabel = (assetType: string): string => {
    switch (assetType) {
      case "index":
        return "指数";
      case "fund":
        return "基金/ETF";
      case "equity":
        return "公司";
      case "commodity":
        return "商品";
      case "macro":
        return "宏观/外汇/债券";
      case "crypto":
        return "加密";
      default:
        return assetType;
    }
  };

  private getLevelLabel = (level: string): string => {
    switch (level) {
      case "broad-index":
        return "宽基";
      case "sector-index":
        return "行业";
      case "theme-basket":
        return "主题";
      case "company":
        return "公司";
      case "instrument":
        return "工具/合约";
      case "macro-indicator":
        return "宏观";
      default:
        return level;
    }
  };
}
