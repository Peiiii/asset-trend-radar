import type { AssetDirectoryCategoriesResponse, AssetDirectoryCategoryId, AssetDirectoryImportResponse, AssetDirectoryPageResponse } from "@gold-insights/market-domain";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory/asset-directory-provider.types";

export class AssetDirectoryService {
  private readonly providersByCategoryId: Map<AssetDirectoryCategoryId, AssetDirectoryProvider>;

  public constructor(private readonly providers: AssetDirectoryProvider[]) {
    this.providersByCategoryId = new Map(this.providers.map((provider) => [provider.categoryId, provider]));
  }

  public listCategories = async (): Promise<AssetDirectoryCategoriesResponse> => ({
    generatedAt: new Date().toISOString(),
    categories: await Promise.all(this.providers.map((provider) => provider.getCategory()))
  });

  public listItems = async (categoryId: AssetDirectoryCategoryId, query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> => {
    const provider = this.providersByCategoryId.get(categoryId) ?? this.providers[0];
    return provider.listItems(query);
  };

  public importItem = async (categoryId: AssetDirectoryCategoryId, itemId: string): Promise<AssetDirectoryImportResponse | null> => {
    const provider = this.providersByCategoryId.get(categoryId);

    if (!provider?.importItem) {
      return null;
    }

    return provider.importItem(itemId);
  };
}

export type { AssetDirectoryQuery } from "./asset-directory/asset-directory-provider.types";
