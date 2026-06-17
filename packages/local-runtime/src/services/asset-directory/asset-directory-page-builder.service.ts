import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse } from "@gold-insights/market-domain";
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
    const matchedItems = this.filterByStatus(keywordItems, query);
    const sortedItems = this.itemListService.sortItems(matchedItems, query.sort, query.order);

    return {
      generatedAt: new Date().toISOString(),
      category,
      keyword: query.keyword,
      status: query.status,
      sort: query.sort,
      order: query.order,
      limit: query.limit,
      offset: query.offset,
      totalCount: matchedItems.length,
      items: sortedItems.slice(query.offset, query.offset + query.limit),
      facets: {
        markets: this.itemListService.toFacets(keywordItems, (item) => item.market),
        assetTypes: this.itemListService.toFacets(keywordItems, (item) => item.assetType),
        statuses: [
          { value: "all", label: "全部状态", count: keywordItems.length },
          { value: "in_pool", label: "已加入走势池", count: keywordItems.filter((item) => item.poolState === "in_pool").length },
          { value: "not_in_pool", label: "待加入走势池", count: keywordItems.filter((item) => item.poolState === "not_in_pool").length }
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

  private filterByStatus = (items: AssetDirectoryItem[], query: AssetDirectoryQuery): AssetDirectoryItem[] => {
    if (query.status === "all") {
      return items;
    }

    return items.filter((item) => item.poolState === query.status);
  };
}
