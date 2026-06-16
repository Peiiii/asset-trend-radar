import type { OhlcvBar } from "@gold-insights/market-domain";
import type { MarketDataProvider, MarketDataRequest, MarketDataResponse } from "../types/market-data-adapter.types";

type EastmoneyFundPage = {
  page: number;
  text: string;
};

type FundNavRecord = {
  date: string;
  unitNav: number;
};

export class EastmoneyFundDataProvider implements MarketDataProvider {
  private readonly pageSize = 49;

  public fetchBars = async (request: MarketDataRequest): Promise<MarketDataResponse> => {
    if (request.timeframe !== "1d") {
      throw new Error(`Eastmoney fund provider only supports daily NAV data, received ${request.timeframe}`);
    }

    const code = request.asset.vendorSymbol ?? request.asset.symbol;
    const pages: EastmoneyFundPage[] = [];
    const records: FundNavRecord[] = [];
    const targetLimit = Math.min(request.limit, 756);
    let totalPages = 1;

    for (let page = 1; page <= totalPages && records.length < targetLimit; page += 1) {
      const text = await this.fetchPage(code, page);
      pages.push({ page, text });
      totalPages = this.parseTotalPages(text) ?? totalPages;
      records.push(...this.parseRecords(text));
    }

    const bars = records
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-targetLimit)
      .map((record): OhlcvBar => {
        const ts = Date.parse(`${record.date}T00:00:00+08:00`);
        return {
          assetId: request.asset.id,
          timeframe: "1d",
          ts,
          open: record.unitNav,
          high: record.unitNav,
          low: record.unitNav,
          close: record.unitNav,
          volume: 0,
          amount: 0,
          source: "eastmoney"
        };
      });

    if (bars.length === 0) {
      throw new Error(`Eastmoney fund response missing NAV data for ${code}`);
    }

    return {
      asset: request.asset,
      bars,
      rawRecords: pages,
      source: "eastmoney"
    };
  };

  private fetchPage = async (code: string, page: number): Promise<string> => {
    const url = new URL("https://fundf10.eastmoney.com/F10DataApi.aspx");
    url.searchParams.set("type", "lsjz");
    url.searchParams.set("code", code);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per", String(this.pageSize));
    url.searchParams.set("sdate", "");
    url.searchParams.set("edate", "");
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            referer: `https://fundf10.eastmoney.com/jjjz_${code}.html`
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          throw new Error(`Eastmoney fund request failed for ${code}: ${response.status} ${response.statusText}`);
        }

        return response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown eastmoney fund request error");
        await this.sleep(250 * attempt);
      }
    }

    throw lastError ?? new Error(`Eastmoney fund request failed for ${code}`);
  };

  private sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  private parseRecords = (text: string): FundNavRecord[] =>
    [...text.matchAll(/<tr><td>(\d{4}-\d{2}-\d{2})<\/td><td[^>]*>([\d.]+)<\/td>/g)].map((match) => ({
      date: match[1],
      unitNav: Number(match[2])
    }));

  private parseTotalPages = (text: string): number | null => {
    const match = text.match(/pages:(\d+)/);
    return match ? Number(match[1]) : null;
  };
}
