type NasdaqScreenerStockRow = {
  symbol?: string;
  lastsale?: string;
  pctchange?: string;
  volume?: string;
  marketCap?: string;
  sector?: string;
  industry?: string;
};

type NasdaqStockScreenerPayload = {
  data?: {
    dataAsOf?: string | null;
    rows?: NasdaqScreenerStockRow[];
  };
};

type NasdaqQuoteSummaryPayload = {
  data?: {
    symbol?: string;
    summaryData?: {
      MarketCap?: { value?: string | number | null };
    };
  };
  status?: {
    rCode?: number;
  };
};

export type NasdaqUsEquityValuationItem = {
  symbol: string;
  latestPrice: number | null;
  return1d: number | null;
  marketCap: number | null;
  volume: number | null;
  sector: string | null;
  industry: string | null;
  currency: "USD";
  latestAt: string | null;
  source: "nasdaq";
};

type NasdaqValuationCache = {
  loadedAt: number;
  itemsBySymbol: Map<string, NasdaqUsEquityValuationItem>;
};

export class NasdaqUsEquityValuationProvider {
  private readonly baseUrl = "https://api.nasdaq.com";
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly fetchRetryDelaysMs = [750, 1500, 3000];
  private readonly quoteSummaryLimit = 80;
  private readonly quoteSummaryConcurrency = 4;
  private stockCache: NasdaqValuationCache | null = null;
  private readonly quoteSummaryCache = new Map<string, { loadedAt: number; item: NasdaqUsEquityValuationItem | null }>();

  public listStockValuationsBySymbol = async (): Promise<Map<string, NasdaqUsEquityValuationItem>> => {
    const now = Date.now();

    if (this.stockCache && now - this.stockCache.loadedAt < this.cacheTtlMs) {
      return this.stockCache.itemsBySymbol;
    }

    const url = new URL("/api/screener/stocks", this.baseUrl);
    url.searchParams.set("tableonly", "true");
    url.searchParams.set("limit", "10000");
    url.searchParams.set("offset", "0");
    url.searchParams.set("download", "true");

    let payload: NasdaqStockScreenerPayload;

    try {
      payload = await this.fetchJson<NasdaqStockScreenerPayload>(url, "NASDAQ stock screener");
    } catch (error) {
      if (this.stockCache) {
        console.warn(error);
        return this.stockCache.itemsBySymbol;
      }

      throw error;
    }

    const loadedAt = new Date().toISOString();
    const itemsBySymbol = new Map(
      (payload.data?.rows ?? [])
        .map((row) => this.toScreenerValuation(row, loadedAt))
        .filter((item): item is NasdaqUsEquityValuationItem => item !== null)
        .map((item) => [this.normalizeSymbol(item.symbol), item])
    );

    this.stockCache = {
      loadedAt: now,
      itemsBySymbol
    };

    return itemsBySymbol;
  };

  public listValuationsForSymbols = async (symbols: string[]): Promise<Map<string, NasdaqUsEquityValuationItem>> => {
    const stockItemsBySymbol = await this.listStockValuationsBySymbol();
    const normalizedSymbols = [...new Set(symbols.map(this.normalizeSymbol).filter((symbol) => this.canRequestSummary(symbol)))];
    const requestedItemsBySymbol = new Map<string, NasdaqUsEquityValuationItem>();
    const missingSymbols: string[] = [];

    for (const symbol of normalizedSymbols) {
      const stockItem = stockItemsBySymbol.get(symbol);

      if (stockItem && stockItem.marketCap !== null) {
        requestedItemsBySymbol.set(symbol, stockItem);
      } else {
        missingSymbols.push(symbol);
      }
    }

    const summaryItems = await this.listQuoteSummaryValuations(missingSymbols.slice(0, this.quoteSummaryLimit));

    for (const item of summaryItems) {
      if (item) {
        requestedItemsBySymbol.set(this.normalizeSymbol(item.symbol), item);
      }
    }

    return requestedItemsBySymbol;
  };

  private listQuoteSummaryValuations = async (symbols: string[]): Promise<Array<NasdaqUsEquityValuationItem | null>> => {
    const items: Array<NasdaqUsEquityValuationItem | null> = [];

    for (let index = 0; index < symbols.length; index += this.quoteSummaryConcurrency) {
      const batch = symbols.slice(index, index + this.quoteSummaryConcurrency);
      items.push(...await Promise.all(batch.map(this.fetchQuoteSummaryValuation)));
    }

    return items;
  };

  private fetchQuoteSummaryValuation = async (symbol: string): Promise<NasdaqUsEquityValuationItem | null> => {
    const cached = this.quoteSummaryCache.get(symbol);
    const now = Date.now();

    if (cached && now - cached.loadedAt < this.cacheTtlMs) {
      return cached.item;
    }

    try {
      const item = await this.tryFetchQuoteSummary(symbol, "stocks") ?? await this.tryFetchQuoteSummary(symbol, "etf");
      this.quoteSummaryCache.set(symbol, { loadedAt: now, item });
      return item;
    } catch (error) {
      console.warn(error);
      return cached?.item ?? null;
    }
  };

  private tryFetchQuoteSummary = async (symbol: string, assetClass: "stocks" | "etf"): Promise<NasdaqUsEquityValuationItem | null> => {
    const url = new URL(`/api/quote/${encodeURIComponent(symbol)}/summary`, this.baseUrl);
    url.searchParams.set("assetclass", assetClass);
    const payload = await this.fetchJson<NasdaqQuoteSummaryPayload>(url, `NASDAQ ${assetClass} quote summary`);

    if (payload.status?.rCode && payload.status.rCode !== 200) {
      return null;
    }

    const marketCap = this.toNullableNumber(payload.data?.summaryData?.MarketCap?.value);

    if (marketCap === null) {
      return null;
    }

    return {
      symbol: payload.data?.symbol ?? symbol,
      latestPrice: null,
      return1d: null,
      marketCap,
      volume: null,
      sector: null,
      industry: null,
      currency: "USD",
      latestAt: new Date().toISOString(),
      source: "nasdaq"
    };
  };

  private fetchJson = async <TData,>(url: URL, label: string): Promise<TData> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.fetchRetryDelaysMs.length; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json,text/plain,*/*",
            origin: "https://www.nasdaq.com",
            referer: "https://www.nasdaq.com/market-activity/stocks/screener",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
          },
          signal: AbortSignal.timeout(20000)
        });

        if (response.ok) {
          return (await response.json()) as TData;
        }

        lastError = new Error(`${label} request failed: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`${label} request failed`);
      }

      const delayMs = this.fetchRetryDelaysMs[attempt];
      if (delayMs !== undefined) {
        await this.delay(delayMs);
      }
    }

    throw lastError ?? new Error(`${label} request failed`);
  };

  private delay = async (delayMs: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });

  private toScreenerValuation = (row: NasdaqScreenerStockRow, loadedAt: string): NasdaqUsEquityValuationItem | null => {
    const symbol = row.symbol?.trim().toUpperCase() ?? "";

    if (symbol.length === 0) {
      return null;
    }

    return {
      symbol,
      latestPrice: this.toNullableNumber(row.lastsale),
      return1d: this.toNullableNumber(row.pctchange),
      marketCap: this.toPositiveNullableNumber(row.marketCap),
      volume: this.toNullableNumber(row.volume),
      sector: this.toNullableText(row.sector),
      industry: this.toNullableText(row.industry),
      currency: "USD",
      latestAt: loadedAt,
      source: "nasdaq"
    };
  };

  private toPositiveNullableNumber = (value: string | number | null | undefined): number | null => {
    const parsed = this.toNullableNumber(value);
    return parsed !== null && parsed > 0 ? parsed : null;
  };

  private toNullableNumber = (value: string | number | null | undefined): number | null => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (!value || value === "N/A") {
      return null;
    }

    const parsed = Number(value.replace(/[$,%]/g, "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  };

  private toNullableText = (value: string | null | undefined): string | null => {
    const text = value?.trim() ?? "";
    return text.length > 0 ? text : null;
  };

  private canRequestSummary = (symbol: string): boolean =>
    /^[A-Z0-9-]{1,12}$/.test(symbol);

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[./]/g, "-").replace(/[^A-Z0-9-]/g, "");
}
