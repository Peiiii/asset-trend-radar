import type { AssetDirectoryItem } from "@gold-insights/market-domain";
import type { AssetValuationNormalizationService } from "../../asset-valuation-normalization.service";
import type { NasdaqAssetValuationService } from "../../valuation/nasdaq-asset-valuation.service";

export class TrendPoolAssetValuationService {
  public constructor(
    private readonly nasdaqAssetValuationService: NasdaqAssetValuationService,
    private readonly normalizationService: AssetValuationNormalizationService
  ) {}

  public enrichItems = async (items: AssetDirectoryItem[]): Promise<AssetDirectoryItem[]> => {
    const valuationCandidates = items.filter(this.nasdaqAssetValuationService.isSupportedAsset);
    const symbols = valuationCandidates.map(this.nasdaqAssetValuationService.getSymbolKey);

    if (symbols.length === 0) {
      return items;
    }

    try {
      const valuationsBySymbol = await this.nasdaqAssetValuationService.listValuationsBySymbol(symbols);
      const enrichedItems = items.map((item) => {
        const valuation = valuationsBySymbol.get(this.nasdaqAssetValuationService.getSymbolKey(item));
        return valuation ? { ...item, valuation, provider: valuation.source ?? item.provider } : item;
      });

      return this.normalizationService.normalizeItems(enrichedItems);
    } catch (error) {
      console.warn(error);
      return items;
    }
  };
}
