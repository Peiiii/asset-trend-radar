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
    const dataStateItems = this.filterByDataState(assetTypeItems, query.dataState);
    const matchedItems = this.filterByStatus(dataStateItems, query);
    const sortedItems = this.itemListService.sortItems(matchedItems, query.sort, query.order);
    const marketFacetItems = this.filterByStatus(this.filterByDataState(this.filterByAssetType(keywordItems, query.assetType), query.dataState), query);
    const assetTypeFacetItems = this.filterByStatus(this.filterByDataState(this.filterByMarket(keywordItems, query.market), query.dataState), query);
    const dataStateFacetItems = this.filterByStatus(assetTypeItems, query);
    const statusFacetItems = dataStateItems;

    return {
      generatedAt: new Date().toISOString(),
      category,
      keyword: query.keyword,
      market: query.market,
      assetType: query.assetType,
      dataState: query.dataState,
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
        dataStates: this.toDataStateFacets(dataStateFacetItems),
        statuses: [
          { value: "all", label: "全部状态", count: statusFacetItems.length },
          { value: "in_pool", label: "已加入走势池", count: statusFacetItems.filter((item) => item.poolState === "in_pool").length },
          { value: "not_in_pool", label: "待加入走势池", count: statusFacetItems.filter((item) => item.poolState === "not_in_pool").length }
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

  private filterByDataState = (items: AssetDirectoryItem[], dataState: AssetDirectoryQuery["dataState"]): AssetDirectoryItem[] => {
    if (dataState === "all") {
      return items;
    }

    return items.filter((item) => item.dataState === dataState);
  };

  private filterByStatus = (items: AssetDirectoryItem[], query: AssetDirectoryQuery): AssetDirectoryItem[] => {
    if (query.status === "all") {
      return items;
    }

    return items.filter((item) => item.poolState === query.status);
  };

  private toDataStateFacets = (items: AssetDirectoryItem[]): AssetDirectoryPageResponse["facets"]["dataStates"] => {
    const counts = items.reduce((entries, item) => {
      entries.set(item.dataState, (entries.get(item.dataState) ?? 0) + 1);
      return entries;
    }, new Map<AssetDirectoryItem["dataState"], number>());

    return [
      { value: "all", label: "全部数据", count: items.length },
      { value: "full_history", label: "完整走势", count: counts.get("full_history") ?? 0 },
      { value: "snapshot", label: "目录快照", count: counts.get("snapshot") ?? 0 },
      { value: "missing", label: "待拉取", count: counts.get("missing") ?? 0 },
      { value: "stale", label: "待更新", count: counts.get("stale") ?? 0 }
    ];
  };
}
