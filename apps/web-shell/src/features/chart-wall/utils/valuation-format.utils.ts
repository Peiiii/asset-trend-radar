import { getAssetValuationStatus } from "@gold-insights/market-domain";
import type { AssetType, AssetValuation, AssetValuationStatus } from "@gold-insights/market-domain";

export type ValuationDisplayStatus = AssetValuationStatus;

export type ValuationDisplay = {
  label: string;
  detail: string;
  title: string;
  rankLabel: string | null;
  value: number | null;
  status: ValuationDisplayStatus;
};

export function getValuationDisplay(valuation: AssetValuation, fallbackCurrency: string, context: { assetType?: AssetType } = {}): ValuationDisplay {
  const currency = valuation.currency ?? fallbackCurrency;
  const primaryValue = valuation.marketCap ?? valuation.floatMarketCap ?? valuation.fullyDilutedValuation;
  const fallbackValue = valuation.turnover24h;
  const value = primaryValue ?? fallbackValue;
  const rankLabel = valuation.marketCapRank ? `#${valuation.marketCapRank}` : null;
  const status = getAssetValuationStatus(valuation, context);

  if (status === "available") {
    return {
      label: formatLargeMoney(primaryValue, currency),
      detail: getValuationDetail(valuation, currency),
      title: getValuationTitle(valuation, currency),
      rankLabel,
      value: primaryValue,
      status
    };
  }

  if (status === "turnover_only") {
    return {
      label: formatLargeMoney(fallbackValue, currency),
      detail: "24h 成交额",
      title: getValuationTitle(valuation, currency),
      rankLabel,
      value: fallbackValue,
      status
    };
  }

  if (status === "not_applicable") {
    const detail = getNotApplicableDetail(context.assetType);

    return {
      label: "不适用",
      detail,
      title: `${detail}，不是后台加载中`,
      rankLabel: null,
      value,
      status
    };
  }

  if (status === "source_unavailable") {
    const detail = getSourceUnavailableDetail(context.assetType);

    return {
      label: "未覆盖",
      detail,
      title: `${detail}；当前目录已有资产符号，但没有接入可用的规模/市值快照，不是后台加载中`,
      rankLabel: null,
      value,
      status
    };
  }

  return {
    label: "源缺值",
    detail: `${valuation.source} 未给规模`,
    title: "当前来源已返回快照，但没有提供规模/市值字段，不是后台加载中",
    rankLabel: null,
    value,
    status
  };
}

export function getValuationSortableValue(valuation: AssetValuation): number | null {
  return valuation.normalized?.marketCap ?? valuation.normalized?.floatMarketCap ?? valuation.normalized?.fullyDilutedValuation ?? valuation.marketCap ?? valuation.floatMarketCap ?? valuation.fullyDilutedValuation ?? null;
}

export function formatLargeMoney(value: number | null, currency: string): string {
  if (value === null) {
    return "暂无";
  }

  if (currency === "CNY") {
    if (Math.abs(value) >= 1_000_000_000_000) {
      return `${formatCompactNumber(value / 1_000_000_000_000)} 万亿`;
    }

    if (Math.abs(value) >= 100_000_000) {
      return `${formatCompactNumber(value / 100_000_000)} 亿`;
    }

    return `${formatCompactNumber(value)} CNY`;
  }

  const prefix = currency === "USD" || currency === "USDT" ? "$" : `${currency} `;

  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${prefix}${formatCompactNumber(value / 1_000_000_000_000)}T`;
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `${prefix}${formatCompactNumber(value / 1_000_000_000)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${prefix}${formatCompactNumber(value / 1_000_000)}M`;
  }

  return `${prefix}${formatCompactNumber(value)}`;
}

function getValuationPrimaryLabel(valuation: AssetValuation): string {
  if (valuation.marketCap !== null) {
    return "总市值";
  }

  if (valuation.floatMarketCap !== null) {
    return "流通市值";
  }

  return "完全稀释估值";
}

function getValuationDetail(valuation: AssetValuation, currency: string): string {
  const normalizedValue = valuation.normalized?.marketCap ?? valuation.normalized?.floatMarketCap ?? valuation.normalized?.fullyDilutedValuation ?? null;
  const primaryLabel = getValuationPrimaryLabel(valuation);

  if (normalizedValue === null || currency === "USD" || currency === "USDT" || currency === "USDC") {
    return primaryLabel;
  }

  return `${primaryLabel} / 约 ${formatLargeMoney(normalizedValue, "USD")}`;
}

function getValuationTitle(valuation: AssetValuation, currency: string): string {
  const normalized = valuation.normalized;
  const normalizedMarketCap = normalized?.marketCap ?? null;
  const shouldShowNormalized = normalized !== null && !isUsdLikeCurrency(currency);
  const parts = [
    valuation.marketCap !== null ? `总市值 ${formatLargeMoney(valuation.marketCap, currency)}` : null,
    valuation.floatMarketCap !== null ? `流通市值 ${formatLargeMoney(valuation.floatMarketCap, currency)}` : null,
    valuation.fullyDilutedValuation !== null ? `完全稀释估值 ${formatLargeMoney(valuation.fullyDilutedValuation, currency)}` : null,
    valuation.turnover24h !== null ? `24h 成交额 ${formatLargeMoney(valuation.turnover24h, currency)}` : null,
    shouldShowNormalized && normalizedMarketCap !== null ? `折算市值 ${formatLargeMoney(normalizedMarketCap, "USD")}` : null,
    shouldShowNormalized ? `汇率来源 ${normalized.source}` : null,
    valuation.source ? `来源 ${valuation.source}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "暂无规模快照";
}

function isUsdLikeCurrency(currency: string): boolean {
  return currency === "USD" || currency === "USDT" || currency === "USDC";
}

function getNotApplicableDetail(assetType: AssetType | undefined): string {
  if (assetType === "commodity") {
    return "商品无市值";
  }

  if (assetType === "macro") {
    return "宏观无市值";
  }

  return "指数无市值";
}

function getSourceUnavailableDetail(assetType: AssetType | undefined): string {
  if (assetType === "fund") {
    return "未接入 AUM/规模源";
  }

  if (assetType === "equity" || assetType === "crypto") {
    return "未接入市值源";
  }

  return "未接入规模源";
}

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2
  });
}
