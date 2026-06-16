import type { FundCatalogMetricSnapshot } from "@gold-insights/market-domain";

type EastmoneyRankPayload = {
  datas: string[];
};

export class EastmoneyFundRankProvider {
  private readonly endpoint = "https://fund.eastmoney.com/data/rankhandler.aspx";

  public fetchSnapshots = async (): Promise<FundCatalogMetricSnapshot[]> => {
    const response = await fetch(this.createUrl(), {
      headers: {
        referer: "https://fund.eastmoney.com/data/fundranking.html"
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Eastmoney fund rank failed: ${response.status} ${response.statusText}`);
    }

    const payload = this.parsePayload(await response.text());
    const metricUpdatedAt = Date.now();

    return payload.datas.map((record) => this.toSnapshot(record, metricUpdatedAt)).filter((snapshot): snapshot is FundCatalogMetricSnapshot => snapshot !== null);
  };

  private createUrl = (): URL => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCFullYear(endDate.getUTCFullYear() - 1);

    const url = new URL(this.endpoint);
    url.searchParams.set("op", "ph");
    url.searchParams.set("dt", "kf");
    url.searchParams.set("ft", "all");
    url.searchParams.set("rs", "");
    url.searchParams.set("gs", "0");
    url.searchParams.set("sc", "1yzf");
    url.searchParams.set("st", "desc");
    url.searchParams.set("sd", this.formatDate(startDate));
    url.searchParams.set("ed", this.formatDate(endDate));
    url.searchParams.set("qdii", "");
    url.searchParams.set("tabSubtype", ",,,,,");
    url.searchParams.set("pi", "1");
    url.searchParams.set("pn", "50000");
    url.searchParams.set("dx", "1");
    url.searchParams.set("v", String(Date.now()));
    return url;
  };

  private parsePayload = (text: string): EastmoneyRankPayload => {
    const datasMatch = text.match(/datas:\[(.*)\],allRecords:/s);

    if (!datasMatch) {
      throw new Error("Eastmoney fund rank payload missing datas");
    }

    return {
      datas: JSON.parse(`[${datasMatch[1]}]`) as string[]
    };
  };

  private toSnapshot = (record: string, metricUpdatedAt: number): FundCatalogMetricSnapshot | null => {
    const fields = record.split(",");
    const code = fields[0]?.trim();

    if (!/^\d{6}$/.test(code)) {
      return null;
    }

    return {
      code,
      latestNav: this.parseNumber(fields[4]),
      accumulatedNav: this.parseNumber(fields[5]),
      latestNavDate: fields[3]?.trim() || null,
      return1d: this.parseNumber(fields[6]),
      return1w: this.parseNumber(fields[7]),
      return1m: this.parseNumber(fields[8]),
      return3m: this.parseNumber(fields[9]),
      return6m: this.parseNumber(fields[10]),
      return1y: this.parseNumber(fields[11]),
      returnYtd: this.parseNumber(fields[14]),
      metricUpdatedAt
    };
  };

  private parseNumber = (value: string | undefined): number | null => {
    const normalized = value?.replace("%", "").trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  private formatDate = (date: Date): string => date.toISOString().slice(0, 10);
}
