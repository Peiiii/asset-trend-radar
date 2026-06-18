import type { AssetSeed } from "./asset-universe.builders";
import { yahoo } from "./asset-universe.builders";

export const hkAssets: AssetSeed[] = [
  yahoo("hk-hsi", "^HSI", "恒生指数", "index", "港股", "HKEX", "HKD", "market-hk-equity", "broad-index", ["宽基指数"]),
  yahoo("hk-tracker", "2800.HK", "盈富基金", "fund", "港股", "HKEX", "HKD", "market-hk-fund", "broad-index", ["ETF", "指数基金"]),
  yahoo("hk-tencent", "0700.HK", "腾讯控股", "equity", "港股", "HKEX", "HKD", "market-hk-equity", "company", ["重点公司", "互联网"]),
  yahoo("hk-baba", "9988.HK", "阿里巴巴-W", "equity", "港股", "HKEX", "HKD", "market-hk-equity", "company", ["重点公司", "互联网"]),
  yahoo("hk-meituan", "3690.HK", "美团-W", "equity", "港股", "HKEX", "HKD", "market-hk-equity", "company", ["重点公司", "消费"]),
];
