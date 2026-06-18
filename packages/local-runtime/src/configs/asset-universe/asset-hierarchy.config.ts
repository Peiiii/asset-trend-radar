import type { AssetSeed } from "./asset-universe.builders";
import { node } from "./asset-universe.builders";

export const assetHierarchy: AssetSeed[] = [
  node("asset-equity", "股票", null, "股票"),
  node("asset-fund", "基金/ETF", null, "基金"),
  node("asset-commodity", "商品", null, "商品"),
  node("asset-rates", "债券与利率", null, "债券"),
  node("asset-fx", "外汇", null, "外汇"),
  node("asset-crypto", "加密", null, "加密"),
  node("asset-macro", "宏观代理", null, "宏观"),
  node("market-us-equity", "美股", "asset-equity", "美股"),
  node("market-a-share", "中国 A 股", "asset-equity", "A 股"),
  node("market-hk-equity", "港股", "asset-equity", "港股"),
  node("market-us-fund", "美股基金/ETF", "asset-fund", "美股"),
  node("market-cn-fund", "A 股基金/ETF", "asset-fund", "A 股"),
  node("market-cn-mutual-fund", "场外基金", "asset-fund", "基金"),
  node("market-hk-fund", "港股基金/ETF", "asset-fund", "港股"),
  node("market-commodity-fund", "商品基金/ETF", "asset-fund", "商品"),
  node("market-commodity", "商品期货", "asset-commodity", "商品"),
  node("market-rates", "债券与利率", "asset-rates", "债券"),
  node("market-fx", "外汇", "asset-fx", "外汇"),
  node("market-crypto", "加密资产", "asset-crypto", "加密"),
  node("market-macro", "宏观代理指标", "asset-macro", "宏观"),
];
