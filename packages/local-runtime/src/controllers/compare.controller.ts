import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";
import { getAssetIdsQueryParam, getRangeQueryParam, getTimeframeQueryParam } from "../utils/query-param.utils";

export class CompareController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleCompare = (url: URL, response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(
      response,
      this.queryService.getCompare({
        assetIds: getAssetIdsQueryParam(url),
        range: getRangeQueryParam(url),
        timeframe: getTimeframeQueryParam(url)
      })
    );
  };
}
