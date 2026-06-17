import type { AssetDirectoryCategoriesResponse, AssetDirectoryCategoryId, AssetDirectoryPageResponse } from "@gold-insights/market-domain";
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
}

export type { AssetDirectoryQuery } from "./asset-directory/asset-directory-provider.types";
