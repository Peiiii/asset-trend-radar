import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";
import type { SqliteAssetRepository } from "@gold-insights/data-storage";
import { getRangeQueryParam, getStringQueryParam, getTimeframeQueryParam } from "../utils/query-param.utils";

export class AssetsController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleAssets = (url: URL, response: ServerResponse): void => {
    const parentId = url.searchParams.has("parentId") ? getStringQueryParam(url, "parentId", "") : null;
    this.jsonResponseProvider.writeJson(response, {
      generatedAt: new Date().toISOString(),
      assets: parentId === null ? this.assetRepository.listAssets() : this.assetRepository.listAssetsByParent(parentId)
    });
  };

  public handleAsset = (assetId: string, response: ServerResponse): boolean => {
    const asset = this.assetRepository.getAsset(assetId);

    if (!asset) {
      return false;
    }

    this.jsonResponseProvider.writeJson(response, {
      generatedAt: new Date().toISOString(),
      asset
    });
    return true;
  };

  public handleDetail = async (assetId: string, url: URL, response: ServerResponse): Promise<boolean> => {
    const payload = await this.queryService.getAssetDetail({
      assetId,
      range: getRangeQueryParam(url),
      timeframe: getTimeframeQueryParam(url)
    });

    if (!payload) {
      return false;
    }

    this.jsonResponseProvider.writeJson(response, payload);
    return true;
  };

  public handleBars = (assetId: string, url: URL, response: ServerResponse): boolean => {
    const payload = this.queryService.getAssetBars({
      assetId,
      range: getRangeQueryParam(url),
      timeframe: getTimeframeQueryParam(url)
    });

    if (!payload) {
      return false;
    }

    this.jsonResponseProvider.writeJson(response, payload);
    return true;
  };

  public handleIndicators = (assetId: string, url: URL, response: ServerResponse): boolean => {
    const payload = this.queryService.getAssetBars({
      assetId,
      range: getRangeQueryParam(url),
      timeframe: getTimeframeQueryParam(url)
    });

    if (!payload) {
      return false;
    }

    this.jsonResponseProvider.writeJson(response, {
      asset: payload.asset,
      timeframe: payload.timeframe,
      range: payload.range,
      generatedAt: payload.generatedAt,
      indicators: payload.indicators
    });
    return true;
  };
}
