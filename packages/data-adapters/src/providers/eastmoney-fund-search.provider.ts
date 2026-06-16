import type { FundSearchResult } from "@gold-insights/market-domain";

type EastmoneyFundSearchPayload = {
  ErrCode?: number;
  Datas?: EastmoneyFundSearchItem[];
};

type EastmoneyFundSearchItem = {
  CODE?: string;
  NAME?: string;
  CATEGORYDESC?: string;
  FundBaseInfo?: {
    SHORTNAME?: string;
    JJGS?: string;
    JJJL?: string;
    FTYPE?: string;
    ISBUY?: string;
    FSRQ?: string;
    DWJZ?: number;
  };
  ZTJJInfo?: Array<{
    TTYPENAME?: string;
  }>;
};

export class EastmoneyFundSearchProvider {
  public searchFunds = async (keyword: string, limit = 20): Promise<FundSearchResult[]> => {
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword.length === 0) {
      return [];
    }

    const url = new URL("https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx");
    url.searchParams.set("m", "1");
    url.searchParams.set("key", normalizedKeyword);

    const response = await fetch(url, {
      headers: {
        referer: "https://fund.eastmoney.com/"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Eastmoney fund search failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as EastmoneyFundSearchPayload;

    if (payload.ErrCode !== 0) {
      throw new Error(`Eastmoney fund search returned error ${payload.ErrCode ?? "unknown"}`);
    }

    return (payload.Datas ?? [])
      .filter((item) => item.CATEGORYDESC === "基金" && item.CODE && item.NAME)
      .slice(0, limit)
      .map((item) => {
        const baseInfo = item.FundBaseInfo;
        return {
          code: String(item.CODE),
          name: this.stripHtml(baseInfo?.SHORTNAME ?? item.NAME ?? ""),
          fundType: baseInfo?.FTYPE ?? null,
          company: baseInfo?.JJGS ?? null,
          managers: this.splitManagers(baseInfo?.JJJL),
          latestNav: typeof baseInfo?.DWJZ === "number" ? baseInfo.DWJZ : null,
          latestNavDate: baseInfo?.FSRQ ?? null,
          themes: [...new Set((item.ZTJJInfo ?? []).flatMap((theme) => (theme.TTYPENAME ? [theme.TTYPENAME] : [])))],
          canBuy: baseInfo?.ISBUY === "1"
        };
      });
  };

  private splitManagers = (value: string | undefined): string[] =>
    value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  private stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "");
}
