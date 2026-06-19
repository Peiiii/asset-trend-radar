import type { ChartWallSortOrder } from "@gold-insights/market-domain";
import type { ControlOption } from "@gold-insights/ui";

export const defaultFilters = {
  range: "6m",
  timeframe: "1d",
  market: "all",
  assetType: "all",
  level: "all",
  tag: "all",
  sort: "trend_score",
  order: "desc" as ChartWallSortOrder,
  signal: "all",
  dataQuality: "all",
  valuationStatus: "all"
};

export const marketFallbackOptions: ControlOption[] = [
  { value: "A 股", label: "A 股", description: "指数、ETF、重点公司" },
  { value: "基金", label: "基金", description: "Eastmoney 场外基金" },
  { value: "美股", label: "美股", description: "指数、ETF、重点公司" },
  { value: "港股", label: "港股", description: "指数、ETF、重点公司" },
  { value: "商品", label: "商品", description: "期货与商品 ETF" },
  { value: "外汇", label: "外汇", description: "汇率代理指标" },
  { value: "债券", label: "债券", description: "利率与债券 ETF" },
  { value: "宏观", label: "宏观", description: "宏观代理指标" },
  { value: "加密", label: "加密", description: "数字资产" }
];

export const assetTypeFallbackOptions: ControlOption[] = [
  { value: "index", label: "指数", description: "宽基、行业与主题指数" },
  { value: "fund", label: "基金/ETF", description: "场外基金、ETF、商品基金" },
  { value: "equity", label: "公司", description: "重点公司走势" },
  { value: "commodity", label: "商品", description: "贵金属、能源、工业品" },
  { value: "macro", label: "宏观/外汇/债券", description: "宏观与利率代理指标" },
  { value: "crypto", label: "加密", description: "主流数字资产" }
];

export const levelFallbackOptions: ControlOption[] = [
  { value: "broad-index", label: "宽基" },
  { value: "sector-index", label: "行业" },
  { value: "theme-basket", label: "主题" },
  { value: "company", label: "公司" },
  { value: "instrument", label: "工具/合约" },
  { value: "macro-indicator", label: "宏观" }
];

export const tagFallbackOptions: ControlOption[] = [
  { value: "贵金属", label: "贵金属" },
  { value: "能源", label: "能源" },
  { value: "农产品", label: "农产品" },
  { value: "工业金属", label: "工业金属" },
  { value: "半导体", label: "半导体" },
  { value: "科技", label: "科技" },
  { value: "消费", label: "消费" },
  { value: "医疗", label: "医疗" },
  { value: "新能源", label: "新能源" },
  { value: "ETF", label: "ETF" },
  { value: "支付宝常见", label: "支付宝常见" }
];

export const sortOptions: ControlOption[] = [
  { value: "trend_score", label: "趋势分", description: "趋势强度优先" },
  { value: "return", label: "区间涨幅", description: "跟随当前图表时间跨度" },
  { value: "return_1d", label: "1D 涨幅" },
  { value: "return_1w", label: "1W 涨幅" },
  { value: "return_1m", label: "1M 涨幅" },
  { value: "return_3m", label: "3M 涨幅" },
  { value: "return_6m", label: "6M 涨幅" },
  { value: "return_1y", label: "1Y 涨幅" },
  { value: "market_cap", label: "市值", description: "有真实规模快照的资产靠前" },
  { value: "volume_ratio", label: "量能放大", description: "最近成交相对 20 日均值" },
  { value: "drawdown", label: "回撤较小", description: "距离区间高点更近" },
  { value: "event_count", label: "事件数", description: "扫描事件多的靠前" },
  { value: "data_point_count", label: "数据点", description: "样本更充足的靠前" },
  { value: "macd", label: "事件/MACD", description: "事件与 MACD 状态优先" },
  { value: "market", label: "市场" },
  { value: "asset_type", label: "品种" },
  { value: "symbol", label: "代码" }
];

export const sortOrderOptions: ControlOption[] = [
  { value: "desc", label: "降序", description: "数值高的靠前" },
  { value: "asc", label: "升序", description: "数值低的靠前" }
];

export const chartWallPageSizeOptions: ControlOption[] = [
  { value: "60", label: "60" },
  { value: "120", label: "120" },
  { value: "240", label: "240" }
];

export const signalFallbackOptions: ControlOption[] = [
  { value: "strong", label: "强趋势" },
  { value: "weak", label: "偏弱" },
  { value: "positive", label: "区间上涨" },
  { value: "negative", label: "区间下跌" },
  { value: "macd_golden_cross", label: "MACD 金叉" },
  { value: "macd_dead_cross", label: "MACD 死叉" },
  { value: "breakout", label: "价格突破" },
  { value: "volume_breakout", label: "量能放大" },
  { value: "eventful", label: "有扫描事件" },
  { value: "data_fresh", label: "数据新鲜" },
  { value: "data_thin", label: "样本较少" },
  { value: "data_lagged", label: "数据滞后" },
  { value: "pinned", label: "已自选" }
];

export const dataQualityFallbackOptions: ControlOption[] = [
  { value: "fresh", label: "数据新鲜" },
  { value: "thin", label: "样本较少" },
  { value: "lagged", label: "数据滞后" },
  { value: "missing", label: "缺少数据" },
  { value: "unknown", label: "状态未知" }
];

export const valuationStatusFallbackOptions: ControlOption[] = [
  { value: "available", label: "有市值" },
  { value: "turnover_only", label: "仅成交额" },
  { value: "source_missing_value", label: "源未返回" },
  { value: "source_unavailable", label: "未接入源" },
  { value: "not_applicable", label: "不适用" }
];
