import type { AssetValuation } from "@gold-insights/market-domain";

export type ValuationDisplay = {
  label: string;
  detail: string;
  title: string;
  rankLabel: string | null;
  value: number | null;
};

export function getValuationDisplay(valuation: AssetValuation, fallbackCurrency: string): ValuationDisplay {
  const currency = valuation.currency ?? fallbackCurrency;
  const primaryValue = valuation.marketCap ?? valuation.floatMarketCap ?? valuation.fullyDilutedValuation;
  const fallbackValue = valuation.turnover24h;
  const value = primaryValue ?? fallbackValue;
  const rankLabel = valuation.marketCapRank ? `#${valuation.marketCapRank}` : null;

  if (primaryValue !== null) {
    return {
      label: formatLargeMoney(primaryValue, currency),
      detail: getValuationDetail(valuation, currency),
      title: getValuationTitle(valuation, currency),
      rankLabel,
      value: primaryValue
    };
  }

  if (fallbackValue !== null) {
    return {
      label: formatLargeMoney(fallbackValue, currency),
      detail: "24h 成交额",
      title: getValuationTitle(valuation, currency),
      rankLabel,
      value: fallbackValue
    };
  }

  return {
    label: valuation.source ? "暂无" : "未接入",
    detail: valuation.source ? "暂无规模" : "源未提供",
    title: valuation.source ? "当前来源暂未返回规模/市值快照" : "当前目录源未提供规模/市值快照，不是后台加载中",
    rankLabel: null,
    value
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

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2
  });
}
