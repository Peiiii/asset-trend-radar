import type { IncomingMessage, ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { ChartWallQueryService } from "../services/chart-wall-query.service";

type WatchlistBody = {
  name?: string;
  assetId?: string;
};

export class WatchlistsController {
  public constructor(
    private readonly queryService: ChartWallQueryService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleList = (response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(response, this.queryService.getWatchlists());
  };

  public handleCreate = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const body = await this.readBody(request);
    this.jsonResponseProvider.writeJson(response, this.queryService.createWatchlist(body.name ?? "新自选"), 201);
  };

  public handleAddAsset = async (watchlistId: string, request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const body = await this.readBody(request);
    this.jsonResponseProvider.writeJson(response, this.queryService.addWatchlistAsset(watchlistId, body.assetId ?? ""));
  };

  public handleRemoveAsset = (watchlistId: string, assetId: string, response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(response, this.queryService.removeWatchlistAsset(watchlistId, assetId));
  };

  private readBody = async (request: IncomingMessage): Promise<WatchlistBody> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("error", reject);
      request.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");

        if (!text) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(text) as WatchlistBody);
        } catch {
          resolve({});
        }
      });
    });
}
