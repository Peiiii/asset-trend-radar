import type { ServerResponse } from "node:http";
import type { ChartWallDataQualityFilter, ChartWallValuationStatusFilter } from "@gold-insights/market-domain";
import { JsonResponseProvider } from "../providers/json-response.provider";
import { getBooleanQueryParam, getIntegerQueryParam, getRangeQueryParam, getSortOrderQueryParam, getStringQueryParam, getTimeframeQueryParam } from "../utils/query-param.utils";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";

export class ChartWallController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleChartWall = async (url: URL, response: ServerResponse): Promise<void> => {
    this.jsonResponseProvider.writeJson(
      response,
      await this.queryService.getChartWall({
        range: getRangeQueryParam(url),
        timeframe: getTimeframeQueryParam(url),
        keyword: getStringQueryParam(url, "q", ""),
        universe: getStringQueryParam(url, "universe", "global"),
        level: getStringQueryParam(url, "level", "all"),
        market: getStringQueryParam(url, "market", "all"),
        assetType: getStringQueryParam(url, "assetType", "all"),
        sort: getStringQueryParam(url, "sort", "trend_score"),
        order: getSortOrderQueryParam(url),
        signal: getStringQueryParam(url, "signal", "all"),
        tag: getStringQueryParam(url, "tag", "all"),
        dataQuality: this.getDataQuality(getStringQueryParam(url, "dataQuality", "all")),
        valuationStatus: this.getValuationStatus(getStringQueryParam(url, "valuationStatus", "all")),
        includeValuations: getBooleanQueryParam(url, "includeValuations"),
        limit: getIntegerQueryParam(url, "limit", 10000, 1, 10000),
        offset: getIntegerQueryParam(url, "offset", 0, 0, 100000)
      })
    );
  };

  private getDataQuality = (value: string): ChartWallDataQualityFilter => {
    const supported: ChartWallDataQualityFilter[] = ["all", "fresh", "thin", "lagged", "missing", "unknown"];
    return supported.includes(value as ChartWallDataQualityFilter) ? (value as ChartWallDataQualityFilter) : "all";
  };

  private getValuationStatus = (value: string): ChartWallValuationStatusFilter => {
    const supported: ChartWallValuationStatusFilter[] = ["all", "available", "turnover_only", "source_missing_value", "source_unavailable", "not_applicable"];
    return supported.includes(value as ChartWallValuationStatusFilter) ? (value as ChartWallValuationStatusFilter) : "all";
  };
}
