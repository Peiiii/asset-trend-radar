import type { FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";

type FundCatalogOrderQuery = {
  keyword: string;
  sort: FundCatalogSortKey;
  order: SortOrder;
};

export class SqliteFundCatalogOrderBuilder {
  public createOrder = (query: FundCatalogOrderQuery): { sql: string; params: string[] } => {
    const direction = query.order === "asc" ? "ASC" : "DESC";
    const nullableNumericColumns: Record<string, string> = {
      latest_nav: "c.latest_nav",
      return_1d: "c.return_1d",
      return_1w: "c.return_1w",
      return_1m: "c.return_1m",
      return_3m: "c.return_3m",
      return_6m: "c.return_6m",
      return_1y: "c.return_1y"
    };

    if (query.sort in nullableNumericColumns) {
      const column = nullableNumericColumns[query.sort];
      return { sql: `ORDER BY ${column} IS NULL, ${column} ${direction}, c.code ASC`, params: [] };
    }

    if (query.sort === "data_point_count") {
      return { sql: `ORDER BY COALESCE(b.data_point_count, 0) ${direction}, c.metric_updated_at IS NULL, c.metric_updated_at DESC, c.code ASC`, params: [] };
    }

    if (query.sort === "name") {
      return { sql: `ORDER BY c.name COLLATE NOCASE ${direction}, c.code ASC`, params: [] };
    }

    if (query.sort === "code") {
      return { sql: `ORDER BY c.code ${direction}`, params: [] };
    }

    return this.createRelevanceOrder(query.keyword);
  };

  private createRelevanceOrder = (keyword: string): { sql: string; params: string[] } => {
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword.length === 0) {
      return { sql: "ORDER BY c.metric_updated_at IS NULL, c.code ASC", params: [] };
    }

    return {
      sql: `ORDER BY
        CASE
          WHEN c.code = ? THEN 0
          WHEN c.code LIKE ? THEN 1
          WHEN c.name = ? THEN 2
          WHEN c.name LIKE ? THEN 3
          ELSE 4
        END,
        c.metric_updated_at IS NULL,
        c.code ASC`,
      params: [normalizedKeyword, `${normalizedKeyword}%`, normalizedKeyword, `${normalizedKeyword}%`]
    };
  };
}
