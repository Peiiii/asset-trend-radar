import type { MarketDataProvider, MarketDataRequest, MarketDataResponse } from "../types/market-data-adapter.types";
import { toBinanceSymbol } from "../utils/vendor-symbol.utils";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

export class BinanceMarketDataProvider implements MarketDataProvider {
  private readonly baseUrl = "https://api.binance.com";

  public fetchBars = async (request: MarketDataRequest): Promise<MarketDataResponse> => {
    const symbol = toBinanceSymbol(request.asset.symbol);
    const url = new URL("/api/v3/klines", this.baseUrl);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", request.timeframe);
    url.searchParams.set("limit", String(request.limit));

    const response = await this.fetchWithRetry(url, symbol);

    const rawRecords = (await response.json()) as BinanceKline[];
    const bars = rawRecords.map((record) => ({
      assetId: request.asset.id,
      timeframe: request.timeframe,
      ts: record[0],
      open: Number(record[1]),
      high: Number(record[2]),
      low: Number(record[3]),
      close: Number(record[4]),
      volume: Number(record[5]),
      amount: Number(record[7]),
      source: "binance"
    }));

    return {
      asset: request.asset,
      bars,
      rawRecords,
      source: "binance"
    };
  };

  private fetchWithRetry = async (url: URL, symbol: string): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
          throw new Error(`Binance request failed for ${symbol}: ${response.status} ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown binance error");
      }
    }

    throw lastError ?? new Error(`Binance request failed for ${symbol}`);
  };
}
