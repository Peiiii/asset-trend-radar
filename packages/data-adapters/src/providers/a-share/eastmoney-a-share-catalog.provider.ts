import type { AssetType } from "@gold-insights/market-domain";

type EastmoneyAshareCatalogRow = {
  f2?: number | string;
  f3?: number | string;
  f12?: string;
  f13?: number;
  f14?: string;
  f100?: string;
};

type EastmoneyAshareCatalogPayload = {
  data?: {
    total?: number;
    diff?: EastmoneyAshareCatalogRow[];
  };
};

export type EastmoneyAshareCatalogItem = {
  id: string;
  code: string;
  yahooSymbol: string;
  label: string;
  assetType: AssetType;
  exchange: string;
  currency: "CNY";
  latestPrice: number | null;
  return1d: number | null;
  latestAt: string | null;
  source: "eastmoney";
  tags: string[];
};

type EastmoneyAshareCatalogCache = {
  loadedAt: number;
  items: EastmoneyAshareCatalogItem[];
};

export class EastmoneyAshareCatalogProvider {
  private readonly endpoint = "https://push2delay.eastmoney.com/api/qt/clist/get";
  private readonly cacheTtlMs = 60 * 1000;
  private readonly pageSize = 100;
  private cache: EastmoneyAshareCatalogCache | null = null;

  public listCatalog = async (): Promise<EastmoneyAshareCatalogItem[]> => {
    const now = Date.now();

    if (this.cache && now - this.cache.loadedAt < this.cacheTtlMs) {
      return this.cache.items;
    }

    const firstPage = await this.fetchPage(1);
    const total = firstPage.total;
    const pageCount = Math.max(Math.ceil(total / this.pageSize), 1);
    const restPages = await Promise.all(Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => this.fetchPage(index + 2)));
    const items = [firstPage, ...restPages]
      .flatMap((page) => page.items)
      .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.yahooSymbol === item.yahooSymbol) === index)
      .sort((left, right) => left.label.localeCompare(right.label, "zh-Hans-CN"));

    this.cache = {
      loadedAt: now,
      items
    };

    return items;
  };

  private fetchPage = async (page: number): Promise<{ total: number; items: EastmoneyAshareCatalogItem[] }> => {
    const url = new URL(this.endpoint);
    url.searchParams.set("pn", String(page));
    url.searchParams.set("pz", String(this.pageSize));
    url.searchParams.set("po", "1");
    url.searchParams.set("np", "1");
    url.searchParams.set("fltt", "2");
    url.searchParams.set("invt", "2");
    url.searchParams.set("fid", "f3");
    url.searchParams.set("fs", "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23");
    url.searchParams.set("fields", "f2,f3,f12,f13,f14,f100");
    url.searchParams.set("ut", "fa5fd1943c7b386f172d6893dbfba10b");
    url.searchParams.set("dect", "1");

    const payload = await this.fetchJson<EastmoneyAshareCatalogPayload>(url);
    const rows = payload.data?.diff ?? [];

    return {
      total: payload.data?.total ?? rows.length,
      items: rows.flatMap(this.toCatalogItem)
    };
  };

  private fetchJson = async <TData,>(url: URL): Promise<TData> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json,text/plain,*/*",
            referer: "https://quote.eastmoney.com/center/gridlist.html",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
          },
          signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
          throw new Error(`Eastmoney A-share catalog failed: ${response.status} ${response.statusText}`);
        }

        return (await response.json()) as TData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown Eastmoney A-share catalog error");
      }
    }

    throw lastError ?? new Error("Eastmoney A-share catalog failed");
  };

  private toCatalogItem = (row: EastmoneyAshareCatalogRow): EastmoneyAshareCatalogItem[] => {
    const code = row.f12?.trim() ?? "";
    const label = row.f14?.trim() ?? "";
    const exchange = this.toExchange(row.f13);

    if (!/^\d{6}$/.test(code) || label.length === 0 || exchange === null) {
      return [];
    }

    const sector = row.f100?.trim() ?? "";
    const yahooSymbol = `${code}.${exchange === "SSE" ? "SS" : "SZ"}`;

    return [{
      id: `a-share:eastmoney:${yahooSymbol}`,
      code,
      yahooSymbol,
      label,
      assetType: "equity",
      exchange,
      currency: "CNY",
      latestPrice: this.toNullableNumber(row.f2),
      return1d: this.toNullableNumber(row.f3),
      latestAt: new Date().toISOString(),
      source: "eastmoney",
      tags: ["股票", exchange, ...(sector ? [sector] : [])]
    }];
  };

  private toExchange = (marketCode: number | undefined): "SSE" | "SZSE" | null => {
    if (marketCode === 1) {
      return "SSE";
    }

    if (marketCode === 0) {
      return "SZSE";
    }

    return null;
  };

  private toNullableNumber = (value: number | string | undefined): number | null => {
    if (value === undefined || value === "-") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
}
