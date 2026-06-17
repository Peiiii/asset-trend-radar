import type { AssetType } from "@gold-insights/market-domain";

type NasdaqListedRow = {
  Symbol: string;
  "Security Name": string;
  "Market Category": string;
  "Test Issue": string;
  ETF: string;
};

type OtherListedRow = {
  "ACT Symbol": string;
  "Security Name": string;
  Exchange: string;
  ETF: string;
  "Test Issue": string;
  "NASDAQ Symbol": string;
};

export type NasdaqUsEquityCatalogItem = {
  id: string;
  symbol: string;
  yahooSymbol: string;
  label: string;
  assetType: AssetType;
  exchange: string;
  currency: "USD";
  source: "nasdaq-trader";
  tags: string[];
};

type NasdaqUsEquityCatalogCache = {
  loadedAt: number;
  items: NasdaqUsEquityCatalogItem[];
};

export class NasdaqUsEquityCatalogProvider {
  private readonly cacheTtlMs = 30 * 60 * 1000;
  private cache: NasdaqUsEquityCatalogCache | null = null;

  public listCatalog = async (): Promise<NasdaqUsEquityCatalogItem[]> => {
    const now = Date.now();

    if (this.cache && now - this.cache.loadedAt < this.cacheTtlMs) {
      return this.cache.items;
    }

    const [nasdaqText, otherText] = await Promise.all([
      this.fetchText("https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"),
      this.fetchText("https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt")
    ]);
    const items = [
      ...this.parseTable<NasdaqListedRow>(nasdaqText).flatMap(this.toNasdaqItem),
      ...this.parseTable<OtherListedRow>(otherText).flatMap(this.toOtherListedItem)
    ]
      .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.yahooSymbol === item.yahooSymbol) === index)
      .sort((left, right) => left.label.localeCompare(right.label, "en-US"));

    this.cache = {
      loadedAt: now,
      items
    };

    return items;
  };

  private fetchText = async (url: string): Promise<string> => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });

    if (!response.ok) {
      throw new Error(`NASDAQ symbol directory failed: ${response.status} ${response.statusText}`);
    }

    return response.text();
  };

  private parseTable = <TRow extends Record<string, string>>(text: string): TRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("File Creation Time"));
    const headers = lines[0]?.split("|") ?? [];

    return lines.slice(1).map((line) => {
      const values = line.split("|");
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as TRow;
    });
  };

  private toNasdaqItem = (row: NasdaqListedRow): NasdaqUsEquityCatalogItem[] => {
    if (row["Test Issue"] !== "N" || !this.isUsefulSecurity(row["Security Name"])) {
      return [];
    }

    return [this.toCatalogItem(row.Symbol, row["Security Name"], this.getNasdaqMarket(row["Market Category"]), row.ETF === "Y")];
  };

  private toOtherListedItem = (row: OtherListedRow): NasdaqUsEquityCatalogItem[] => {
    if (row["Test Issue"] !== "N" || !this.isUsefulSecurity(row["Security Name"])) {
      return [];
    }

    return [this.toCatalogItem(row["NASDAQ Symbol"] || row["ACT Symbol"], row["Security Name"], this.getOtherExchange(row.Exchange), row.ETF === "Y")];
  };

  private toCatalogItem = (symbol: string, name: string, exchange: string, isEtf: boolean): NasdaqUsEquityCatalogItem => {
    const yahooSymbol = this.toYahooSymbol(symbol);
    const assetType: AssetType = isEtf ? "fund" : "equity";

    return {
      id: `us-equity:nasdaq-trader:${yahooSymbol}`,
      symbol,
      yahooSymbol,
      label: this.cleanSecurityName(name),
      assetType,
      exchange,
      currency: "USD",
      source: "nasdaq-trader",
      tags: [isEtf ? "ETF" : "股票", exchange]
    };
  };

  private isUsefulSecurity = (name: string): boolean => {
    const normalizedName = name.toLowerCase();
    return !/(warrant|right|unit|preferred|preference|note|bond|debenture|certificate)/i.test(normalizedName);
  };

  private cleanSecurityName = (name: string): string =>
    name
      .replace(/\s+-\s+(Common Stock|Ordinary Shares?|Class [A-Z] Ordinary Shares?|American Depositary Shares.*|ETF)$/i, "")
      .replace(/\s+Common Stock$/i, "")
      .replace(/\s+/g, " ")
      .trim();

  private toYahooSymbol = (symbol: string): string => symbol.replace(/[./]/g, "-").toUpperCase();

  private getNasdaqMarket = (marketCategory: string): string => {
    switch (marketCategory) {
      case "Q":
        return "Nasdaq Global Select";
      case "G":
        return "Nasdaq Global Market";
      case "S":
        return "Nasdaq Capital Market";
      default:
        return "Nasdaq";
    }
  };

  private getOtherExchange = (exchange: string): string => {
    switch (exchange) {
      case "N":
        return "NYSE";
      case "A":
        return "NYSE American";
      case "P":
        return "NYSE Arca";
      case "Z":
        return "Cboe BZX";
      case "V":
        return "IEX";
      default:
        return exchange || "US Exchange";
    }
  };
}
