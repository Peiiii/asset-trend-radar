import type { AssetSeed } from "./asset-universe.builders";
import { yahoo } from "./asset-universe.builders";

export const aShareAssets: AssetSeed[] = [
  yahoo("cn-sse", "000001.SS", "上证指数", "index", "A 股", "SSE", "CNY", "market-a-share", "broad-index", ["宽基指数"]),
  yahoo("cn-csi300", "000300.SS", "沪深 300", "index", "A 股", "SSE", "CNY", "market-a-share", "broad-index", ["宽基指数"]),
  yahoo("cn-szse", "399001.SZ", "深证成指", "index", "A 股", "SZSE", "CNY", "market-a-share", "broad-index", ["宽基指数"]),
  yahoo("cn-300etf", "510300.SS", "沪深 300 ETF", "fund", "A 股", "SSE", "CNY", "market-cn-fund", "broad-index", ["ETF"]),
  yahoo("cn-chip-512480", "512480.SS", "半导体 ETF", "fund", "A 股", "SSE", "CNY", "market-cn-fund", "sector-index", ["半导体", "行业基金"]),
  yahoo("cn-chip-512760", "512760.SS", "芯片 ETF", "fund", "A 股", "SSE", "CNY", "market-cn-fund", "sector-index", ["半导体", "行业基金"]),
  yahoo("cn-ai-515790", "515790.SS", "光伏/新能源 ETF", "fund", "A 股", "SSE", "CNY", "market-cn-fund", "theme-basket", ["主题篮子", "行业基金"]),
  yahoo("cn-kweichow", "600519.SS", "贵州茅台", "equity", "A 股", "SSE", "CNY", "market-a-share", "company", ["重点公司", "消费"]),
  yahoo("cn-catl", "300750.SZ", "宁德时代", "equity", "A 股", "SZSE", "CNY", "market-a-share", "company", ["重点公司", "新能源"]),
  yahoo("cn-pingan", "601318.SS", "中国平安", "equity", "A 股", "SSE", "CNY", "market-a-share", "company", ["重点公司", "金融"]),
  yahoo("cn-cmb", "600036.SS", "招商银行", "equity", "A 股", "SSE", "CNY", "market-a-share", "company", ["重点公司", "金融"]),
  yahoo("cn-byd", "002594.SZ", "比亚迪", "equity", "A 股", "SZSE", "CNY", "market-a-share", "company", ["重点公司", "新能源"]),
];
