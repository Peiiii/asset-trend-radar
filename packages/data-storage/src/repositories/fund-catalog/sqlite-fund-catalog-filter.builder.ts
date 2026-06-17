import type { FundCatalogPageFilter, FundCatalogPageQuery } from "./fund-catalog-page.types";

export class SqliteFundCatalogFilterBuilder {
  public createPageFilter = (query: FundCatalogPageQuery): FundCatalogPageFilter => {
    const conditions = ["c.source = 'eastmoney'"];
    const params: Array<number | string> = [];
    const normalizedKeyword = query.keyword.trim();

    if (normalizedKeyword.length > 0) {
      const upperKeyword = `%${normalizedKeyword.toUpperCase()}%`;
      conditions.push("(c.code LIKE ? OR c.name LIKE ? OR UPPER(COALESCE(c.pinyin, '')) LIKE ? OR UPPER(COALESCE(c.full_pinyin, '')) LIKE ? OR COALESCE(c.fund_type, '') LIKE ?)");
      params.push(`${normalizedKeyword}%`, `%${normalizedKeyword}%`, upperKeyword, upperKeyword, `%${normalizedKeyword}%`);
    }

    if (query.fundType !== "all") {
      if (query.fundType === "未分类") {
        conditions.push("(c.fund_type IS NULL OR c.fund_type = '')");
      } else {
        conditions.push("c.fund_type = ?");
        params.push(query.fundType);
      }
    }

    if (query.status === "imported") {
      conditions.push("a.id IS NOT NULL");
    }

    if (query.status === "not_imported") {
      conditions.push("a.id IS NULL");
    }

    if (query.dataState === "full_history") {
      conditions.push("a.id IS NOT NULL");
    }

    if (query.dataState === "snapshot") {
      conditions.push("a.id IS NULL AND c.metric_updated_at IS NOT NULL");
    }

    if (query.dataState === "missing") {
      conditions.push("a.id IS NULL AND c.metric_updated_at IS NULL");
    }

    if (query.dataState === "stale") {
      conditions.push("1 = 0");
    }

    return {
      fromSql: "FROM fund_catalog c LEFT JOIN assets a ON a.id = 'fund-cn-' || c.code LEFT JOIN (SELECT asset_id, COUNT(*) AS data_point_count FROM ohlcv_bars WHERE timeframe = '1d' GROUP BY asset_id) b ON b.asset_id = a.id",
      whereSql: `WHERE ${conditions.join(" AND ")}`,
      params
    };
  };
}
