import type {
  AssetDirectoryCategory,
  AssetDirectoryDataState,
  AssetDirectoryItem,
  AssetDirectoryPageResponse,
  AssetDirectorySortKey,
  AssetDirectoryStatusFilter,
  FundCatalogImportStatus,
  FundCatalogPageItem,
  FundCatalogSortKey
} from "@gold-insights/market-domain";
import type { FundDiscoveryService } from "../fund-discovery.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";
import { AssetDirectoryValuationFactory } from "./shared/asset-directory-valuation.factory";

export class FundAssetDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "funds";
  private readonly valuationFactory = new AssetDirectoryValuationFactory();

  public constructor(private readonly fundDiscoveryService: FundDiscoveryService) {}

  public getCategory = async (): Promise<AssetDirectoryCategory> => {
    const page = await this.fundDiscoveryService.listCatalogPage({
      keyword: "",
      fundType: "all",
      status: "all",
      sort: "relevance",
      order: "desc",
      limit: 1,
      offset: 0
    });

    return {
      id: this.categoryId,
      label: "基金目录",
      description: "Eastmoney 场外基金全量轻量目录，支持快照收益和加入走势池。",
      assetTypes: ["fund"],
      markets: ["基金"],
      coverage: "full",
      capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "refresh_snapshot", "open_detail"],
      itemCount: page.totalCount,
      inPoolCount: page.importedTotalCount,
      lastSyncedAt: page.catalog.metricSyncedAt ?? page.catalog.syncedAt
    };
  };

  public listItems = async (query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> => {
    const category = await this.getCategory();

    if (!this.matchesDirectoryFacets(query)) {
      return this.emptyPage(category, query);
    }

    const page = await this.fundDiscoveryService.listCatalogPage({
      keyword: query.keyword,
      fundType: "all",
      status: this.toFundStatus(query.status),
      dataState: query.dataState,
      sort: this.toFundSort(query.sort),
      order: query.order,
      limit: query.limit,
      offset: query.offset
    });

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
      totalCount: page.totalCount,
      items: page.items.map(this.toDirectoryItem),
      facets: {
        markets: [{ value: "基金", label: "基金", count: page.totalCount }],
        assetTypes: [{ value: "fund", label: "基金", count: page.totalCount }],
        dataStates: page.dataStateFacets,
        statuses: page.statusFacets.map((facet) => ({
          value: this.fromFundStatus(facet.value),
          label: facet.label,
          count: facet.count
        }))
      }
    };
  };

  private matchesDirectoryFacets = (query: AssetDirectoryQuery): boolean =>
    (query.market === "all" || query.market === "基金") && (query.assetType === "all" || query.assetType === "fund");

  private emptyPage = (category: AssetDirectoryCategory, query: AssetDirectoryQuery): AssetDirectoryPageResponse => ({
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
    totalCount: 0,
    items: [],
    facets: {
      markets: [],
      assetTypes: [],
      dataStates: [
        { value: "all", label: "全部数据", count: 0 },
        { value: "full_history", label: "完整走势", count: 0 },
        { value: "snapshot", label: "目录快照", count: 0 },
        { value: "missing", label: "待拉取", count: 0 },
        { value: "stale", label: "待更新", count: 0 }
      ],
      statuses: [
        { value: "all", label: "全部状态", count: 0 },
        { value: "in_pool", label: "已加入走势池", count: 0 },
        { value: "not_in_pool", label: "待加入走势池", count: 0 }
      ]
    }
  });

  private toDirectoryItem = (item: FundCatalogPageItem): AssetDirectoryItem => ({
    id: `${this.categoryId}:${item.code}`,
    categoryId: this.categoryId,
    label: item.name,
    symbol: item.code,
    market: "基金",
    assetType: "fund",
    provider: item.source,
    exchange: "东方财富基金",
    currency: "CNY",
    latestValue: item.latestNav,
    latestValueLabel: "最新净值",
    latestValueAt: item.latestNavDate,
    returns: {
      return1d: item.return1d,
      return1m: item.return1m,
      return3m: item.return3m,
      return6m: item.return6m,
      return1y: item.return1y
    },
    valuation: this.valuationFactory.empty(),
    poolState: item.isImported ? "in_pool" : "not_in_pool",
    dataState: this.toDataState(item),
    dataPointCount: item.dataPointCount,
    assetId: item.assetId,
    tags: [item.fundType ?? "未分类"]
  });

  private toDataState = (item: FundCatalogPageItem): AssetDirectoryDataState => {
    if (item.metricSource === "local_bars") {
      return "full_history";
    }

    if (item.metricSource === "catalog_snapshot") {
      return "snapshot";
    }

    return "missing";
  };

  private toFundStatus = (status: AssetDirectoryStatusFilter): FundCatalogImportStatus => {
    if (status === "in_pool") {
      return "imported";
    }

    if (status === "not_in_pool") {
      return "not_imported";
    }

    return "all";
  };

  private fromFundStatus = (status: FundCatalogImportStatus): AssetDirectoryStatusFilter => {
    if (status === "imported") {
      return "in_pool";
    }

    if (status === "not_imported") {
      return "not_in_pool";
    }

    return "all";
  };

  private toFundSort = (sort: AssetDirectorySortKey): FundCatalogSortKey => {
    const sortMap: Record<AssetDirectorySortKey, FundCatalogSortKey> = {
      relevance: "relevance",
      label: "name",
      latest_value: "latest_nav",
      market_cap: "relevance",
      return_1d: "return_1d",
      return_1m: "return_1m",
      return_3m: "return_3m",
      return_6m: "return_6m",
      return_1y: "return_1y",
      data_point_count: "data_point_count"
    };

    return sortMap[sort];
  };
}
