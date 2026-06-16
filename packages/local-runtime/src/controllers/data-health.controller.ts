import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";

export class DataHealthController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleDataHealth = (response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(response, this.queryService.getDataHealth());
  };
}
