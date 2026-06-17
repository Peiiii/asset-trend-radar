import type { AssetLevel, AssetType } from "@gold-insights/market-domain";

export function getAssetTypeLabel(assetType: AssetType | string): string {
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
}

export function getAssetLevelLabel(level: AssetLevel | string): string {
  switch (level) {
    case "asset-class":
      return "资产大类";
    case "market":
      return "市场";
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
}
