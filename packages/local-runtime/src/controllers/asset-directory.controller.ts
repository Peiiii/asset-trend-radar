import type { ServerResponse } from "node:http";
import type { AssetDirectoryAssetTypeFilter, AssetDirectoryCategoryId, AssetDirectorySortKey, AssetDirectorySortOrder, AssetDirectoryStatusFilter } from "@gold-insights/market-domain";
import { ErrorResponseProvider } from "../providers/error-response.provider";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { AssetDirectoryService } from "../services/asset-directory.service";
import { getStringQueryParam } from "../utils/query-param.utils";

export class AssetDirectoryController {
  public constructor(
    private readonly assetDirectoryService: AssetDirectoryService,
    private readonly jsonResponseProvider = new JsonResponseProvider(),
    private readonly errorResponseProvider = new ErrorResponseProvider()
  ) {}

  public handleCategories = async (response: ServerResponse): Promise<void> => {
    this.jsonResponseProvider.writeJson(response, await this.assetDirectoryService.listCategories());
  };

  public handleCategoryItems = async (categoryId: string, url: URL, response: ServerResponse): Promise<void> => {
    const resolvedCategoryId = this.getCategoryId(categoryId);

    if (!resolvedCategoryId) {
      this.errorResponseProvider.writeNotFound(response);
      return;
    }

    this.jsonResponseProvider.writeJson(
      response,
      await this.assetDirectoryService.listItems(resolvedCategoryId, {
        keyword: getStringQueryParam(url, "keyword", "").trim(),
        market: getStringQueryParam(url, "market", "all").trim() || "all",
        assetType: this.getAssetType(getStringQueryParam(url, "assetType", "all")),
        status: this.getStatus(getStringQueryParam(url, "status", "all")),
        sort: this.getSort(getStringQueryParam(url, "sort", "relevance")),
        order: this.getOrder(getStringQueryParam(url, "order", "desc")),
        limit: Math.min(Math.max(Number(getStringQueryParam(url, "limit", "50")) || 50, 1), 1000),
        offset: Math.max(Number(getStringQueryParam(url, "offset", "0")) || 0, 0)
      })
    );
  };

  public handleImportItem = async (categoryId: string, itemId: string, response: ServerResponse): Promise<void> => {
    const resolvedCategoryId = this.getCategoryId(categoryId);

    if (!resolvedCategoryId) {
      this.errorResponseProvider.writeNotFound(response);
      return;
    }

    const result = await this.assetDirectoryService.importItem(resolvedCategoryId, decodeURIComponent(itemId));

    if (!result) {
      this.errorResponseProvider.writeBadRequest(response, "该目录暂不支持加入走势池");
      return;
    }

    this.jsonResponseProvider.writeJson(response, result);
  };

  private getCategoryId = (value: string): AssetDirectoryCategoryId | null => {
    const supported: AssetDirectoryCategoryId[] = ["funds", "crypto", "commodities", "us-equity", "a-share", "hk-equity", "macro"];
    return supported.includes(value as AssetDirectoryCategoryId) ? (value as AssetDirectoryCategoryId) : null;
  };

  private getStatus = (value: string): AssetDirectoryStatusFilter => {
    if (value === "in_pool" || value === "not_in_pool") {
      return value;
    }

    return "all";
  };

  private getAssetType = (value: string): AssetDirectoryAssetTypeFilter => {
    const supported: AssetDirectoryAssetTypeFilter[] = ["all", "crypto", "equity", "index", "fund", "commodity", "macro"];
    return supported.includes(value as AssetDirectoryAssetTypeFilter) ? (value as AssetDirectoryAssetTypeFilter) : "all";
  };

  private getSort = (value: string): AssetDirectorySortKey => {
    const supported: AssetDirectorySortKey[] = ["relevance", "label", "latest_value", "market_cap", "return_1d", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];
    return supported.includes(value as AssetDirectorySortKey) ? (value as AssetDirectorySortKey) : "relevance";
  };

  private getOrder = (value: string): AssetDirectorySortOrder => (value === "asc" ? "asc" : "desc");
}
