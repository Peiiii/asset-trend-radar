type CoinGeckoCryptoMarketRow = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number | null;
  market_cap?: number | null;
  market_cap_rank?: number | null;
  fully_diluted_valuation?: number | null;
  total_volume?: number | null;
  last_updated?: string | null;
};

export type CoinGeckoCryptoMarketItem = {
  id: string;
  symbol: string;
  label: string;
  latestPrice: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  fullyDilutedValuation: number | null;
  turnover24h: number | null;
  currency: "USD";
  latestAt: string | null;
  source: "coingecko";
};

type CoinGeckoCryptoMarketsCache = {
  loadedAt: number;
  itemsBySymbol: Map<string, CoinGeckoCryptoMarketItem>;
};

export class CoinGeckoCryptoMarketsProvider {
  private readonly baseUrl = "https://api.coingecko.com";
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly pageCount = 2;
  private readonly pageSize = 250;
  private cache: CoinGeckoCryptoMarketsCache | null = null;

  public listMarketsBySymbol = async (): Promise<Map<string, CoinGeckoCryptoMarketItem>> => {
    const now = Date.now();

    if (this.cache && now - this.cache.loadedAt < this.cacheTtlMs) {
      return this.cache.itemsBySymbol;
    }

    const pages = await Promise.all(Array.from({ length: this.pageCount }, (_, index) => this.fetchPage(index + 1)));
    const itemsBySymbol = this.toItemsBySymbol(pages.flat());

    this.cache = {
      loadedAt: now,
      itemsBySymbol
    };

    return itemsBySymbol;
  };

  private fetchPage = async (page: number): Promise<CoinGeckoCryptoMarketRow[]> => {
    const url = new URL("/api/v3/coins/markets", this.baseUrl);
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("per_page", String(this.pageSize));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sparkline", "false");

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`CoinGecko crypto markets request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  };

  private toItemsBySymbol = (rows: CoinGeckoCryptoMarketRow[]): Map<string, CoinGeckoCryptoMarketItem> => {
    const itemsBySymbol = new Map<string, CoinGeckoCryptoMarketItem>();

    for (const row of rows) {
      const item = this.toMarketItem(row);

      if (!item) {
        continue;
      }

      const existingItem = itemsBySymbol.get(item.symbol);
      if (!existingItem || this.rankItem(item) > this.rankItem(existingItem)) {
        itemsBySymbol.set(item.symbol, item);
      }
    }

    return itemsBySymbol;
  };

  private toMarketItem = (row: CoinGeckoCryptoMarketRow): CoinGeckoCryptoMarketItem | null => {
    const symbol = row.symbol?.trim().toUpperCase() ?? "";
    const id = row.id?.trim() ?? "";
    const label = row.name?.trim() ?? "";

    if (symbol.length === 0 || id.length === 0 || label.length === 0) {
      return null;
    }

    return {
      id,
      symbol,
      label,
      latestPrice: this.toNullableNumber(row.current_price),
      marketCap: this.toNullableNumber(row.market_cap),
      marketCapRank: this.toNullableNumber(row.market_cap_rank),
      fullyDilutedValuation: this.toNullableNumber(row.fully_diluted_valuation),
      turnover24h: this.toNullableNumber(row.total_volume),
      currency: "USD",
      latestAt: row.last_updated ?? null,
      source: "coingecko"
    };
  };

  private rankItem = (item: CoinGeckoCryptoMarketItem): number =>
    item.marketCap ?? (item.marketCapRank ? 1 / item.marketCapRank : 0);

  private toNullableNumber = (value: number | null | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
}
