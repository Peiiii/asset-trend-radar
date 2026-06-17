type BinanceExchangeInfoSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
};

type BinanceTicker24h = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  closeTime: number;
  count: number;
};

export type BinanceCryptoCatalogItem = {
  symbol: string;
  displaySymbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: string;
  latestPrice: number | null;
  return1d: number | null;
  quoteVolume: number | null;
  tradeCount: number;
  latestAt: string | null;
  source: "binance";
};

type BinanceCryptoCatalogCache = {
  loadedAt: number;
  items: BinanceCryptoCatalogItem[];
};

export class BinanceCryptoCatalogProvider {
  private readonly baseUrl = "https://api.binance.com";
  private readonly cacheTtlMs = 60 * 1000;
  private cache: BinanceCryptoCatalogCache | null = null;

  public listUsdtSpotCatalog = async (): Promise<BinanceCryptoCatalogItem[]> => {
    const now = Date.now();

    if (this.cache && now - this.cache.loadedAt < this.cacheTtlMs) {
      return this.cache.items;
    }

    const [symbols, tickers] = await Promise.all([
      this.fetchExchangeInfoSymbols(),
      this.fetchTicker24h()
    ]);
    const tickersBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
    const items = symbols
      .filter((symbol) => symbol.status === "TRADING")
      .filter((symbol) => symbol.isSpotTradingAllowed !== false)
      .filter((symbol) => symbol.quoteAsset === "USDT")
      .map((symbol) => this.toCatalogItem(symbol, tickersBySymbol.get(symbol.symbol) ?? null))
      .sort((left, right) => (right.quoteVolume ?? -1) - (left.quoteVolume ?? -1) || left.baseAsset.localeCompare(right.baseAsset));

    this.cache = {
      loadedAt: now,
      items
    };

    return items;
  };

  private fetchExchangeInfoSymbols = async (): Promise<BinanceExchangeInfoSymbol[]> => {
    const url = new URL("/api/v3/exchangeInfo", this.baseUrl);
    const payload = await this.fetchJson<{ symbols?: BinanceExchangeInfoSymbol[] }>(url, "exchangeInfo");
    return Array.isArray(payload.symbols) ? payload.symbols : [];
  };

  private fetchTicker24h = async (): Promise<BinanceTicker24h[]> => {
    const url = new URL("/api/v3/ticker/24hr", this.baseUrl);
    const payload = await this.fetchJson<BinanceTicker24h[]>(url, "ticker24hr");
    return Array.isArray(payload) ? payload : [];
  };

  private fetchJson = async <TData,>(url: URL, label: string): Promise<TData> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
          throw new Error(`Binance catalog ${label} request failed: ${response.status} ${response.statusText}`);
        }

        return (await response.json()) as TData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown Binance catalog error");
      }
    }

    throw lastError ?? new Error(`Binance catalog ${label} request failed`);
  };

  private toCatalogItem = (symbol: BinanceExchangeInfoSymbol, ticker: BinanceTicker24h | null): BinanceCryptoCatalogItem => ({
    symbol: symbol.symbol,
    displaySymbol: `${symbol.baseAsset}/${symbol.quoteAsset}`,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset,
    exchange: "Binance Spot",
    latestPrice: this.toNullableNumber(ticker?.lastPrice),
    return1d: this.toNullableNumber(ticker?.priceChangePercent),
    quoteVolume: this.toNullableNumber(ticker?.quoteVolume),
    tradeCount: Number(ticker?.count ?? 0),
    latestAt: ticker?.closeTime ? new Date(ticker.closeTime).toISOString() : null,
    source: "binance"
  });

  private toNullableNumber = (value: string | undefined): number | null => {
    if (value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
}
