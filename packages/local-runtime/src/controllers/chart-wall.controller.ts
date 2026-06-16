import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import { getRangeQueryParam, getSortOrderQueryParam, getStringQueryParam, getTimeframeQueryParam } from "../utils/query-param.utils";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";

export class ChartWallController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleChartWall = (url: URL, response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(
      response,
      this.queryService.getChartWall({
        range: getRangeQueryParam(url),
        timeframe: getTimeframeQueryParam(url),
        universe: getStringQueryParam(url, "universe", "global"),
        level: getStringQueryParam(url, "level", "all"),
        market: getStringQueryParam(url, "market", "all"),
        assetType: getStringQueryParam(url, "assetType", "all"),
        sort: getStringQueryParam(url, "sort", "trend_score"),
        order: getSortOrderQueryParam(url),
        signal: getStringQueryParam(url, "signal", "all"),
        tag: getStringQueryParam(url, "tag", "all")
      })
    );
  };
}
