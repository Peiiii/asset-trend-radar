import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { IngestionWorkerService } from "../services/ingestion-worker.service";

export class RefreshController {
  public constructor(
    private readonly ingestionWorkerService: IngestionWorkerService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleRefresh = async (response: ServerResponse): Promise<void> => {
    await this.ingestionWorkerService.runOnce();
    this.jsonResponseProvider.writeJson(response, {
      status: "ok",
      refreshedAt: new Date().toISOString()
    });
  };
}
