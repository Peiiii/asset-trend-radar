import { getAssetValuationStatus, getDataQualityStatus } from "@gold-insights/market-domain";
import type { ChartWallDataQualityFilter, ChartWallItem, ChartWallValuationStatusFilter } from "@gold-insights/market-domain";

export class ChartWallItemFilterService {
  public filterByDataQuality = (items: ChartWallItem[], dataQuality: ChartWallDataQualityFilter): ChartWallItem[] => {
    if (dataQuality === "all") {
      return items;
    }

    const referenceTimestamp = Date.now();
    return items.filter((item) => getDataQualityStatus(item, referenceTimestamp) === dataQuality);
  };

  public filterByValuationStatus = (items: ChartWallItem[], valuationStatus: ChartWallValuationStatusFilter): ChartWallItem[] => {
    if (valuationStatus === "all") {
      return items;
    }

    return items.filter((item) => getAssetValuationStatus(item.valuation, { assetType: item.assetType }) === valuationStatus);
  };
}
