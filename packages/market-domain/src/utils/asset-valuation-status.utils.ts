import type { AssetType, AssetValuation, AssetValuationStatus } from "../types/asset.types";

export function getAssetValuationStatus(valuation: AssetValuation, context: { assetType?: AssetType } = {}): AssetValuationStatus {
  const primaryValue = valuation.marketCap ?? valuation.floatMarketCap ?? valuation.fullyDilutedValuation;

  if (primaryValue !== null) {
    return "available";
  }

  if (valuation.turnover24h !== null) {
    return "turnover_only";
  }

  if (isNonValuationAssetType(context.assetType) && valuation.source === null) {
    return "not_applicable";
  }

  if (valuation.source === null) {
    return "source_unavailable";
  }

  return "source_missing_value";
}

function isNonValuationAssetType(assetType: AssetType | undefined): boolean {
  return assetType === "index" || assetType === "commodity" || assetType === "macro";
}
