import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";
import { getStringQueryParam } from "../utils/query-param.utils";

export class ScannerController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleEvents = (url: URL, response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(
      response,
      this.queryService.getScannerEvents({
        universe: getStringQueryParam(url, "universe", "global"),
        eventType: getStringQueryParam(url, "eventType", "all")
      })
    );
  };
}
