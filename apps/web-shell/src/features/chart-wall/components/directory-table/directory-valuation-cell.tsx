import type { AssetDirectoryItem } from "@gold-insights/market-domain";
import { getDirectoryActiveSortCellClassName } from "./directory-return-pill";
import "./directory-valuation-cell.css";

type DirectoryValuationCellProps = {
  item: AssetDirectoryItem;
  active: boolean;
};

export function DirectoryValuationCell({ item, active }: DirectoryValuationCellProps): JSX.Element {
  const valuation = item.valuation;
  const currency = valuation.currency ?? item.currency;
  const primaryValue = valuation.marketCap ?? valuation.floatMarketCap ?? valuation.fullyDilutedValuation;
  const fallbackValue = valuation.turnover24h;
  const label = primaryValue !== null ? formatLargeMoney(primaryValue, currency) : fallbackValue !== null ? formatLargeMoney(fallbackValue, currency) : "暂无";
  const detail = primaryValue !== null ? getValuationPrimaryLabel(valuation) : fallbackValue !== null ? "24h 成交额" : "规模";
  const rankLabel = valuation.marketCapRank ? `#${valuation.marketCapRank}` : null;

  return (
    <td className={getDirectoryActiveSortCellClassName(active)}>
      <div className="directory-valuation-cell" title={getValuationTitle(item)}>
        <strong>{label}</strong>
        <small>{[detail, rankLabel].filter(Boolean).join(" / ")}</small>
      </div>
    </td>
  );
}

function getValuationPrimaryLabel(valuation: AssetDirectoryItem["valuation"]): string {
  if (valuation.marketCap !== null) {
    return "总市值";
  }

  if (valuation.floatMarketCap !== null) {
    return "流通市值";
  }

  return "完全稀释估值";
}

function getValuationTitle(item: AssetDirectoryItem): string {
  const valuation = item.valuation;
  const currency = valuation.currency ?? item.currency;
  const parts = [
    valuation.marketCap !== null ? `总市值 ${formatLargeMoney(valuation.marketCap, currency)}` : null,
    valuation.floatMarketCap !== null ? `流通市值 ${formatLargeMoney(valuation.floatMarketCap, currency)}` : null,
    valuation.fullyDilutedValuation !== null ? `完全稀释估值 ${formatLargeMoney(valuation.fullyDilutedValuation, currency)}` : null,
    valuation.turnover24h !== null ? `24h 成交额 ${formatLargeMoney(valuation.turnover24h, currency)}` : null,
    valuation.source ? `来源 ${valuation.source}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "暂无规模快照";
}

function formatLargeMoney(value: number | null, currency: string): string {
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

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2
  });
}
