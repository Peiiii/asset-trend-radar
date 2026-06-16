import type { OhlcvBar, Timeframe } from "@gold-insights/market-domain";
import type { MarketDataProvider, MarketDataRequest, MarketDataResponse } from "../types/market-data-adapter.types";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      description?: string;
    } | null;
  };
};

export class YahooMarketDataProvider implements MarketDataProvider {
  private readonly hosts = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

  public fetchBars = async (request: MarketDataRequest): Promise<MarketDataResponse> => {
    const symbol = request.asset.vendorSymbol ?? request.asset.symbol;
    const { interval, range } = this.getYahooIntervalAndRange(request.timeframe, request.limit);
    let lastError: Error | null = null;

    for (const host of this.hosts) {
      try {
        const url = new URL(`/v8/finance/chart/${encodeURIComponent(symbol)}`, host);
        url.searchParams.set("interval", interval);
        url.searchParams.set("range", range);
        url.searchParams.set("events", "history");
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
          throw new Error(`Yahoo request failed for ${symbol}: ${response.status} ${response.statusText}`);
        }

        const payload = (await response.json()) as YahooChartResponse;
        const result = payload.chart?.result?.[0];
        const errorDescription = payload.chart?.error?.description;

        if (!result?.timestamp || errorDescription) {
          throw new Error(errorDescription ?? `Yahoo response missing chart data for ${symbol}`);
        }

        const rawBars = this.toBars(request, result.timestamp, result.indicators?.quote?.[0]);
        const bars = request.timeframe === "4h" ? this.resampleFourHour(rawBars) : rawBars;

        return {
          asset: request.asset,
          bars: bars.slice(-request.limit),
          rawRecords: [payload],
          source: "yahoo"
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown yahoo error");
      }
    }

    throw lastError ?? new Error(`Yahoo request failed for ${symbol}`);
  };

  private getYahooIntervalAndRange = (timeframe: Timeframe, limit: number): { interval: string; range: string } => {
    if (timeframe === "15m") {
      return { interval: "15m", range: "60d" };
    }

    if (timeframe === "1h" || timeframe === "4h") {
      return { interval: "1h", range: "730d" };
    }

    if (timeframe === "1w") {
      return { interval: "1wk", range: "10y" };
    }

    if (timeframe === "1mo") {
      return { interval: "1mo", range: "20y" };
    }

    return { interval: "1d", range: limit > 365 ? "5y" : "2y" };
  };

  private toBars = (
    request: MarketDataRequest,
    timestamps: number[],
    quote: {
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    } = {}
  ): OhlcvBar[] =>
    timestamps
      .map((timestamp, index) => {
        const close = quote.close?.[index];

        if (close === null || close === undefined || Number.isNaN(close)) {
          return null;
        }

        const open = quote.open?.[index] ?? close;
        const high = quote.high?.[index] ?? close;
        const low = quote.low?.[index] ?? close;
        return {
          assetId: request.asset.id,
          timeframe: request.timeframe,
          ts: timestamp * 1000,
          open,
          high,
          low,
          close,
          volume: quote.volume?.[index] ?? 0,
          amount: 0,
          source: "yahoo"
        };
      })
      .filter((bar): bar is OhlcvBar => bar !== null)
      .sort((left, right) => left.ts - right.ts);

  private resampleFourHour = (bars: OhlcvBar[]): OhlcvBar[] => {
    const groups = new Map<number, OhlcvBar[]>();

    for (const bar of bars) {
      const bucket = Math.floor(bar.ts / (4 * 60 * 60 * 1000)) * 4 * 60 * 60 * 1000;
      groups.set(bucket, [...(groups.get(bucket) ?? []), bar]);
    }

    return [...groups.entries()]
      .map(([ts, group]) => ({
        assetId: group[0].assetId,
        timeframe: "4h" as const,
        ts,
        open: group[0].open,
        high: Math.max(...group.map((bar) => bar.high)),
        low: Math.min(...group.map((bar) => bar.low)),
        close: group.at(-1)?.close ?? group[0].close,
        volume: group.reduce((sum, bar) => sum + bar.volume, 0),
        amount: 0,
        source: "yahoo"
      }))
      .sort((left, right) => left.ts - right.ts);
  };
}
