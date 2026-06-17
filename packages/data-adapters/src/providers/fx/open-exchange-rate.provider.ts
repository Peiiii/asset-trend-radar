type OpenExchangeRatePayload = {
  result?: string;
  base_code?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

export type CurrencyRateToUsd = {
  currency: string;
  rateToUsd: number;
  source: "open-er-api" | "currency-identity";
  latestAt: string | null;
};

type ExchangeRateCache = {
  loadedAt: number;
  ratesToUsdByCurrency: Map<string, CurrencyRateToUsd>;
};

export class OpenExchangeRateProvider {
  private readonly endpoint = "https://open.er-api.com/v6/latest/USD";
  private readonly cacheTtlMs = 30 * 60 * 1000;
  private cache: ExchangeRateCache | null = null;

  public listRatesToUsd = async (currencies: string[]): Promise<Map<string, CurrencyRateToUsd>> => {
    const requestedCurrencies = [...new Set(currencies.map(this.normalizeCurrency).filter((currency) => currency.length > 0))];
    const loadedRates = await this.loadRatesToUsdByCurrency();
    const selectedRates = new Map<string, CurrencyRateToUsd>();

    for (const currency of requestedCurrencies) {
      const rate = loadedRates.get(currency);

      if (rate) {
        selectedRates.set(currency, rate);
      }
    }

    return selectedRates;
  };

  private loadRatesToUsdByCurrency = async (): Promise<Map<string, CurrencyRateToUsd>> => {
    const now = Date.now();

    if (this.cache && now - this.cache.loadedAt < this.cacheTtlMs) {
      return this.cache.ratesToUsdByCurrency;
    }

    const response = await fetch(this.endpoint, {
      headers: {
        accept: "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`exchange-rate request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as OpenExchangeRatePayload;

    if (payload.result !== "success" || payload.base_code !== "USD" || !payload.rates) {
      throw new Error("exchange-rate response did not include USD-based rates");
    }

    const latestAt = this.toIsoDate(payload.time_last_update_utc);
    const ratesToUsdByCurrency = new Map<string, CurrencyRateToUsd>([
      ["USD", { currency: "USD", rateToUsd: 1, source: "currency-identity", latestAt }],
      ["USDT", { currency: "USDT", rateToUsd: 1, source: "currency-identity", latestAt }],
      ["USDC", { currency: "USDC", rateToUsd: 1, source: "currency-identity", latestAt }]
    ]);

    for (const [currency, usdToCurrencyRate] of Object.entries(payload.rates)) {
      if (typeof usdToCurrencyRate !== "number" || !Number.isFinite(usdToCurrencyRate) || usdToCurrencyRate <= 0) {
        continue;
      }

      const normalizedCurrency = this.normalizeCurrency(currency);

      if (this.isUsdLikeCurrency(normalizedCurrency)) {
        continue;
      }

      ratesToUsdByCurrency.set(normalizedCurrency, {
        currency: normalizedCurrency,
        rateToUsd: 1 / usdToCurrencyRate,
        source: "open-er-api",
        latestAt
      });
    }

    this.cache = {
      loadedAt: now,
      ratesToUsdByCurrency
    };

    return ratesToUsdByCurrency;
  };

  private normalizeCurrency = (value: string): string =>
    value.trim().toUpperCase();

  private isUsdLikeCurrency = (value: string): boolean =>
    value === "USD" || value === "USDT" || value === "USDC";

  private toIsoDate = (value: string | undefined): string | null => {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
  };
}
