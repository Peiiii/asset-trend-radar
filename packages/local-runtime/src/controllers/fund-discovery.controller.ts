import type { IncomingMessage, ServerResponse } from "node:http";
import { ErrorResponseProvider } from "../providers/error-response.provider";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { FundDiscoveryService } from "../services/fund-discovery.service";
import { getStringQueryParam } from "../utils/query-param.utils";

type ImportFundBody = {
  code?: string;
};

export class FundDiscoveryController {
  public constructor(
    private readonly fundDiscoveryService: FundDiscoveryService,
    private readonly jsonResponseProvider = new JsonResponseProvider(),
    private readonly errorResponseProvider = new ErrorResponseProvider()
  ) {}

  public handleSearch = async (url: URL, response: ServerResponse): Promise<void> => {
    const keyword = getStringQueryParam(url, "keyword", "").trim();
    const limit = Math.min(Math.max(Number(getStringQueryParam(url, "limit", "20")) || 20, 1), 100);
    this.jsonResponseProvider.writeJson(response, await this.fundDiscoveryService.searchFunds(keyword, limit));
  };

  public handleCatalogSummary = (response: ServerResponse): void => {
    this.jsonResponseProvider.writeJson(response, this.fundDiscoveryService.getCatalogSummary());
  };

  public handleCatalogSync = async (response: ServerResponse): Promise<void> => {
    this.jsonResponseProvider.writeJson(response, await this.fundDiscoveryService.syncCatalog(), 201);
  };

  public handleImport = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const body = await this.readBody(request);

    try {
      this.jsonResponseProvider.writeJson(response, await this.fundDiscoveryService.importEastmoneyFund(body.code ?? ""), 201);
    } catch (error) {
      this.errorResponseProvider.writeBadRequest(response, error instanceof Error ? error.message : "基金导入失败");
    }
  };

  private readBody = async (request: IncomingMessage): Promise<ImportFundBody> =>
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
          resolve(JSON.parse(text) as ImportFundBody);
        } catch {
          resolve({});
        }
      });
    });
}
