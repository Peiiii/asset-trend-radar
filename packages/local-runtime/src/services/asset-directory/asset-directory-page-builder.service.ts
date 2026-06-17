import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse } from "@gold-insights/market-domain";
import { getAssetTypeLabel } from "../../utils/asset-label.utils";
import { AssetDirectoryItemListService } from "./asset-directory-item-list.service";
import type { AssetDirectoryQuery } from "./asset-directory-provider.types";

type AssetDirectoryPageBuildRequest = {
  category: AssetDirectoryCategory;
  items: AssetDirectoryItem[];
  query: AssetDirectoryQuery;
  getSearchText(item: AssetDirectoryItem): string;
};

export class AssetDirectoryPageBuilderService {
  private readonly itemListService = new AssetDirectoryItemListService();

  public buildPage = ({ category, items, query, getSearchText }: AssetDirectoryPageBuildRequest): AssetDirectoryPageResponse => {
    const keyword = query.keyword.trim().toLowerCase();
    const keywordItems = this.filterByKeyword(items, keyword, getSearchText);
    const marketItems = this.filterByMarket(keywordItems, query.market);
    const assetTypeItems = this.filterByAssetType(marketItems, query.assetType);
    const matchedItems = this.filterByStatus(assetTypeItems, query);
    const sortedItems = this.itemListService.sortItems(matchedItems, query.sort, query.order);
    const marketFacetItems = this.filterByStatus(this.filterByAssetType(keywordItems, query.assetType), query);
    const assetTypeFacetItems = this.filterByStatus(this.filterByMarket(keywordItems, query.market), query);

    return {
      generatedAt: new Date().toISOString(),
      category,
      keyword: query.keyword,
      market: query.market,
      assetType: query.assetType,
      status: query.status,
      sort: query.sort,
      order: query.order,
      limit: query.limit,
      offset: query.offset,
      totalCount: matchedItems.length,
      items: sortedItems.slice(query.offset, query.offset + query.limit),
      facets: {
        markets: this.itemListService.toFacets(marketFacetItems, (item) => item.market),
        assetTypes: this.itemListService.toFacets(assetTypeFacetItems, (item) => item.assetType, getAssetTypeLabel),
        statuses: [
          { value: "all", label: "全部状态", count: assetTypeItems.length },
          { value: "in_pool", label: "已加入走势池", count: assetTypeItems.filter((item) => item.poolState === "in_pool").length },
          { value: "not_in_pool", label: "待加入走势池", count: assetTypeItems.filter((item) => item.poolState === "not_in_pool").length }
        ]
      }
    };
  };

  private filterByKeyword = (items: AssetDirectoryItem[], keyword: string, getSearchText: (item: AssetDirectoryItem) => string): AssetDirectoryItem[] => {
    if (keyword.length === 0) {
      return items;
    }

    return items.filter((item) => getSearchText(item).toLowerCase().includes(keyword));
  };

  private filterByMarket = (items: AssetDirectoryItem[], market: string): AssetDirectoryItem[] => {
    if (market === "all") {
      return items;
    }

    return items.filter((item) => item.market === market);
  };

  private filterByAssetType = (items: AssetDirectoryItem[], assetType: AssetDirectoryQuery["assetType"]): AssetDirectoryItem[] => {
    if (assetType === "all") {
      return items;
    }

    return items.filter((item) => item.assetType === assetType);
  };

  private filterByStatus = (items: AssetDirectoryItem[], query: AssetDirectoryQuery): AssetDirectoryItem[] => {
    if (query.status === "all") {
      return items;
    }

    return items.filter((item) => item.poolState === query.status);
  };
}
