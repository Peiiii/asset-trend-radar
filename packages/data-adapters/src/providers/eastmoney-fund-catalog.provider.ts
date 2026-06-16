import type { FundCatalogEntry } from "@gold-insights/market-domain";

type EastmoneyFundCatalogTuple = [string, string, string, string, string];

export class EastmoneyFundCatalogProvider {
  public fetchCatalog = async (): Promise<FundCatalogEntry[]> => {
    const response = await fetch("https://fund.eastmoney.com/js/fundcode_search.js", {
      headers: {
        referer: "https://fund.eastmoney.com/"
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`Eastmoney fund catalog failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const tuples = this.parseCatalog(text);
    const updatedAt = Date.now();

    return tuples
      .filter(([code, , name]) => /^\d{6}$/.test(code) && name.trim().length > 0)
      .map(([code, pinyin, name, fundType, fullPinyin]) => ({
        code,
        name: name.trim(),
        fundType: fundType.trim() || null,
        pinyin: pinyin.trim() || null,
        fullPinyin: fullPinyin.trim() || null,
        source: "eastmoney" as const,
        updatedAt
      }));
  };

  private parseCatalog = (text: string): EastmoneyFundCatalogTuple[] => {
    const jsonText = text.replace(/^\uFEFF?var\s+r\s*=\s*/, "").replace(/;\s*$/, "");
    const payload = JSON.parse(jsonText) as unknown;

    if (!Array.isArray(payload)) {
      throw new Error("Eastmoney fund catalog payload is not an array");
    }

    return payload.filter(this.isCatalogTuple);
  };

  private isCatalogTuple = (value: unknown): value is EastmoneyFundCatalogTuple =>
    Array.isArray(value) && value.length >= 5 && value.every((item) => typeof item === "string");
}
