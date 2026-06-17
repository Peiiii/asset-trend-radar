import { Activity, CandlestickChart, Coins, Gem, LineChart, Sparkles, Zap } from "lucide-react";
import "./strategy-preset-strip.css";

export type StrategyPresetFilters = {
  market?: string;
  assetType?: string;
  tag?: string;
  signal?: string;
  dataQuality?: string;
  valuationStatus?: string;
  sort?: string;
  order?: string;
  range?: string;
  timeframe?: string;
};

type StrategyPreset = {
  id: string;
  label: string;
  description: string;
  filters: StrategyPresetFilters;
  icon: JSX.Element;
};

type StrategyPresetStripProps = {
  currentFilters: StrategyPresetFilters;
  onApply(filters: StrategyPresetFilters): void;
};

const strategyPresets: StrategyPreset[] = [
  {
    id: "strong-trend",
    label: "强趋势",
    description: "趋势分优先",
    filters: { market: "all", assetType: "all", signal: "strong", sort: "trend_score", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Sparkles size={15} aria-hidden="true" />
  },
  {
    id: "volume-breakout",
    label: "放量异动",
    description: "量比放大优先",
    filters: { market: "all", assetType: "all", signal: "volume_breakout", sort: "volume_ratio", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Zap size={15} aria-hidden="true" />
  },
  {
    id: "macd-golden-cross",
    label: "MACD 金叉",
    description: "事件与金叉线索",
    filters: { market: "all", assetType: "all", signal: "macd_golden_cross", sort: "macd", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Activity size={15} aria-hidden="true" />
  },
  {
    id: "fund-leaders",
    label: "基金领涨",
    description: "场外基金 1M",
    filters: { market: "基金", assetType: "fund", signal: "all", sort: "return_1m", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Coins size={15} aria-hidden="true" />
  },
  {
    id: "commodity-volume",
    label: "商品异动",
    description: "商品量能",
    filters: { market: "商品", assetType: "all", tag: "all", signal: "all", sort: "volume_ratio", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Gem size={15} aria-hidden="true" />
  },
  {
    id: "precious-metals",
    label: "贵金属",
    description: "黄金白银铂钯",
    filters: { market: "商品", assetType: "all", tag: "贵金属", signal: "all", sort: "return_1m", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Gem size={15} aria-hidden="true" />
  },
  {
    id: "energy-chain",
    label: "能源链",
    description: "原油天然气",
    filters: { market: "商品", assetType: "all", tag: "能源", signal: "all", sort: "volume_ratio", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Zap size={15} aria-hidden="true" />
  },
  {
    id: "agriculture-chain",
    label: "农产品",
    description: "谷物软商品",
    filters: { market: "商品", assetType: "all", tag: "农产品", signal: "all", sort: "return_1m", order: "desc", range: "6m", timeframe: "1d" },
    icon: <Coins size={15} aria-hidden="true" />
  },
  {
    id: "crypto-momentum",
    label: "加密动量",
    description: "加密 1M 涨幅",
    filters: { market: "加密", assetType: "crypto", signal: "all", sort: "return_1m", order: "desc", range: "3m", timeframe: "1d" },
    icon: <CandlestickChart size={15} aria-hidden="true" />
  }
];

export function StrategyPresetStrip({ currentFilters, onApply }: StrategyPresetStripProps): JSX.Element {
  return (
    <section className="strategy-preset-strip" aria-label="快捷策略">
      <div className="strategy-preset-strip__label">
        <LineChart size={15} aria-hidden="true" />
        <span>快捷策略</span>
      </div>
      <div className="strategy-preset-strip__items">
        {strategyPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`strategy-preset ${isPresetActive(preset, currentFilters) ? "strategy-preset--active" : ""}`}
            onClick={() => onApply(preset.filters)}
          >
            {preset.icon}
            <span>
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function isPresetActive(preset: StrategyPreset, currentFilters: StrategyPresetFilters): boolean {
  return Object.entries(preset.filters).every(([key, value]) => currentFilters[key as keyof StrategyPresetFilters] === value);
}
