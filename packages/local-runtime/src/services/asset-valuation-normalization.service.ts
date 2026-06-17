import type { CurrencyRateToUsd, OpenExchangeRateProvider } from "@gold-insights/data-adapters";
import type { AssetValuation } from "@gold-insights/market-domain";

type ValuationBearingItem = {
  valuation: AssetValuation;
};

export class AssetValuationNormalizationService {
  public constructor(private readonly exchangeRateProvider: OpenExchangeRateProvider) {}

  public normalizeItems = async <TItem extends ValuationBearingItem>(items: TItem[]): Promise<TItem[]> => {
    const currencies = this.getCurrenciesRequiringRates(items);
    const ratesToUsdByCurrency = await this.loadRatesToUsd(currencies);

    return items.map((item) => ({
      ...item,
      valuation: this.normalizeValuation(item.valuation, ratesToUsdByCurrency)
    }));
  };

  private loadRatesToUsd = async (currencies: string[]): Promise<Map<string, CurrencyRateToUsd>> => {
    const identityRates = new Map<string, CurrencyRateToUsd>([
      ["USD", { currency: "USD", rateToUsd: 1, source: "currency-identity", latestAt: null }],
      ["USDT", { currency: "USDT", rateToUsd: 1, source: "currency-identity", latestAt: null }],
      ["USDC", { currency: "USDC", rateToUsd: 1, source: "currency-identity", latestAt: null }]
    ]);

    if (currencies.length === 0) {
      return identityRates;
    }

    try {
      const liveRates = await this.exchangeRateProvider.listRatesToUsd(currencies);
      return new Map([...identityRates, ...liveRates]);
    } catch (error) {
      console.warn(error);
      return identityRates;
    }
  };

  private normalizeValuation = (valuation: AssetValuation, ratesToUsdByCurrency: Map<string, CurrencyRateToUsd>): AssetValuation => {
    const currency = this.normalizeCurrency(valuation.currency);

    if (!currency || !this.hasAnyValuationValue(valuation)) {
      return {
        ...valuation,
        normalized: null
      };
    }

    const rate = ratesToUsdByCurrency.get(currency);

    if (!rate) {
      return {
        ...valuation,
        normalized: null
      };
    }

    return {
      ...valuation,
      normalized: {
        currency: "USD",
        marketCap: this.convertToUsd(valuation.marketCap, rate.rateToUsd),
        floatMarketCap: this.convertToUsd(valuation.floatMarketCap, rate.rateToUsd),
        fullyDilutedValuation: this.convertToUsd(valuation.fullyDilutedValuation, rate.rateToUsd),
        turnover24h: this.convertToUsd(valuation.turnover24h, rate.rateToUsd),
        rateToUsd: rate.rateToUsd,
        source: rate.source,
        updatedAt: rate.latestAt ?? valuation.updatedAt
      }
    };
  };

  private getCurrenciesRequiringRates = (items: ValuationBearingItem[]): string[] =>
    [...new Set(items.map((item) => this.normalizeCurrency(item.valuation.currency)).filter((currency): currency is string => currency !== null && !this.isUsdLikeCurrency(currency)))];

  private hasAnyValuationValue = (valuation: AssetValuation): boolean =>
    [valuation.marketCap, valuation.floatMarketCap, valuation.fullyDilutedValuation, valuation.turnover24h].some((value) => typeof value === "number" && Number.isFinite(value));

  private convertToUsd = (value: number | null, rateToUsd: number): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value * rateToUsd : null;

  private normalizeCurrency = (value: string | null): string | null => {
    const currency = value?.trim().toUpperCase() ?? "";
    return currency.length > 0 ? currency : null;
  };

  private isUsdLikeCurrency = (currency: string): boolean =>
    currency === "USD" || currency === "USDT" || currency === "USDC";
}
