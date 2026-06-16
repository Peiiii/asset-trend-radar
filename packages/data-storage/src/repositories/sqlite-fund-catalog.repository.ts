import type { DatabaseSync } from "node:sqlite";
import type { FundCatalogEntry, FundCatalogImportStatus, FundCatalogMetricSnapshot, FundCatalogSortKey, FundCatalogSummary, SortOrder } from "@gold-insights/market-domain";
import { SqliteFundCatalogOrderBuilder } from "./sqlite-fund-catalog-order.builder";

export type FundCatalogPageQuery = {
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  sort: FundCatalogSortKey;
  order: SortOrder;
  limit: number;
  offset: number;
};

export type FundCatalogPageRecord = FundCatalogEntry & {
  assetId: string | null;
  latestNav: number | null;
  accumulatedNav: number | null;
  latestNavDate: string | null;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  returnYtd: number | null;
  metricUpdatedAt: number | null;
};

export type FundCatalogPageResult = {
  totalCount: number;
  importedTotalCount: number;
  items: FundCatalogPageRecord[];
};

export class SqliteFundCatalogRepository {
  public constructor(
    private readonly database: DatabaseSync,
    private readonly orderBuilder = new SqliteFundCatalogOrderBuilder()
  ) {}

  public upsertEntries = (entries: FundCatalogEntry[]): number => {
    const statement = this.database.prepare(`
      INSERT INTO fund_catalog (code, name, fund_type, pinyin, full_pinyin, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        fund_type = excluded.fund_type,
        pinyin = excluded.pinyin,
        full_pinyin = excluded.full_pinyin,
        source = excluded.source,
        updated_at = excluded.updated_at
    `);

    for (const entry of entries) {
      statement.run(entry.code, entry.name, entry.fundType, entry.pinyin, entry.fullPinyin, entry.source, entry.updatedAt);
    }

    return entries.length;
  };

  public search = (keyword: string, limit: number): FundCatalogEntry[] => {
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword.length === 0) {
      return [];
    }

    const likeKeyword = `%${normalizedKeyword.toUpperCase()}%`;
    const rows = this.database
      .prepare(
        `SELECT code, name, fund_type, pinyin, full_pinyin, source, updated_at
         FROM fund_catalog
         WHERE code LIKE ?
            OR name LIKE ?
            OR UPPER(COALESCE(pinyin, '')) LIKE ?
            OR UPPER(COALESCE(full_pinyin, '')) LIKE ?
            OR COALESCE(fund_type, '') LIKE ?
         ORDER BY
           CASE
             WHEN code = ? THEN 0
             WHEN code LIKE ? THEN 1
             WHEN name = ? THEN 2
             WHEN name LIKE ? THEN 3
             ELSE 4
           END,
           code
         LIMIT ?`
      )
      .all(
        `${normalizedKeyword}%`,
        `%${normalizedKeyword}%`,
        likeKeyword,
        likeKeyword,
        `%${normalizedKeyword}%`,
        normalizedKeyword,
        `${normalizedKeyword}%`,
        normalizedKeyword,
        `${normalizedKeyword}%`,
        limit
      );

    return rows.map(this.toEntry);
  };

  public upsertMetricSnapshots = (snapshots: FundCatalogMetricSnapshot[]): number => {
    const statement = this.database.prepare(`
      UPDATE fund_catalog
      SET latest_nav = ?,
          accumulated_nav = ?,
          latest_nav_date = ?,
          return_1d = ?,
          return_1w = ?,
          return_1m = ?,
          return_3m = ?,
          return_6m = ?,
          return_1y = ?,
          return_ytd = ?,
          metric_updated_at = ?
      WHERE code = ?
    `);
    let updatedCount = 0;

    for (const snapshot of snapshots) {
      const result = statement.run(
        snapshot.latestNav,
        snapshot.accumulatedNav,
        snapshot.latestNavDate,
        snapshot.return1d,
        snapshot.return1w,
        snapshot.return1m,
        snapshot.return3m,
        snapshot.return6m,
        snapshot.return1y,
        snapshot.returnYtd,
        snapshot.metricUpdatedAt,
        snapshot.code
      );
      updatedCount += Number(result.changes ?? 0);
    }

    return updatedCount;
  };

  public getByCode = (code: string): FundCatalogEntry | null => {
    const row = this.database
      .prepare(
        `SELECT code, name, fund_type, pinyin, full_pinyin, source, updated_at
         FROM fund_catalog
         WHERE code = ?`
      )
      .get(code);

    return row ? this.toEntry(row) : null;
  };

  public listPage = (query: FundCatalogPageQuery): FundCatalogPageResult => {
    const filter = this.createPageFilter(query);
    const order = this.orderBuilder.createOrder(query);
    const totalRow = this.database.prepare(`SELECT COUNT(*) AS count ${filter.fromSql} ${filter.whereSql}`).get(...filter.params) as { count: number };
    const importedRow = this.database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM fund_catalog c
         INNER JOIN assets a ON a.id = 'fund-cn-' || c.code
         WHERE c.source = 'eastmoney'`
      )
      .get() as { count: number };
    const rows = this.database
      .prepare(
        `SELECT c.code,
                c.name,
                c.fund_type,
                c.pinyin,
                c.full_pinyin,
                c.source,
                c.updated_at,
                c.latest_nav,
                c.accumulated_nav,
                c.latest_nav_date,
                c.return_1d,
                c.return_1w,
                c.return_1m,
                c.return_3m,
                c.return_6m,
                c.return_1y,
                c.return_ytd,
                c.metric_updated_at,
                a.id AS asset_id
         ${filter.fromSql}
         ${filter.whereSql}
         ${order.sql}
         LIMIT ? OFFSET ?`
      )
      .all(...filter.params, ...order.params, query.limit, query.offset);

    return {
      totalCount: totalRow.count,
      importedTotalCount: importedRow.count,
      items: rows.map(this.toPageRecord)
    };
  };

  public listFundTypeFacets = (keyword: string, status: FundCatalogImportStatus): Array<{ value: string; label: string; count: number }> => {
    const filter = this.createPageFilter({
      keyword,
      fundType: "all",
      status,
      sort: "relevance",
      order: "desc",
      limit: 1,
      offset: 0
    });
    const rows = this.database
      .prepare(
        `SELECT COALESCE(NULLIF(c.fund_type, ''), '未分类') AS value, COUNT(*) AS count
         ${filter.fromSql}
         ${filter.whereSql}
         GROUP BY COALESCE(NULLIF(c.fund_type, ''), '未分类')
         ORDER BY count DESC, value
         LIMIT 80`
      )
      .all(...filter.params);

    return rows.map((row) => {
      const record = row as Record<string, number | string>;
      const value = String(record.value);
      return {
        value,
        label: value,
        count: Number(record.count)
      };
    });
  };

  public listStatusFacets = (keyword: string, fundType: string): Array<{ value: FundCatalogImportStatus; label: string; count: number }> => [
    { value: "all", label: "全部", count: this.countByStatus(keyword, fundType, "all") },
    { value: "imported", label: "已加入走势池", count: this.countByStatus(keyword, fundType, "imported") },
    { value: "not_imported", label: "待加入走势池", count: this.countByStatus(keyword, fundType, "not_imported") }
  ];

  public getSummary = (): FundCatalogSummary => {
    const row = this.database.prepare("SELECT COUNT(*) AS total_count, MAX(updated_at) AS synced_at, MAX(metric_updated_at) AS metric_synced_at FROM fund_catalog WHERE source = 'eastmoney'").get() as {
      total_count: number;
      synced_at: number | null;
      metric_synced_at: number | null;
    };

    return {
      totalCount: row.total_count,
      syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
      metricSyncedAt: row.metric_synced_at ? new Date(row.metric_synced_at).toISOString() : null,
      source: "eastmoney"
    };
  };

  private createPageFilter = (query: FundCatalogPageQuery): { fromSql: string; whereSql: string; params: Array<number | string> } => {
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

    return {
      fromSql: "FROM fund_catalog c LEFT JOIN assets a ON a.id = 'fund-cn-' || c.code LEFT JOIN (SELECT asset_id, COUNT(*) AS data_point_count FROM ohlcv_bars WHERE timeframe = '1d' GROUP BY asset_id) b ON b.asset_id = a.id",
      whereSql: `WHERE ${conditions.join(" AND ")}`,
      params
    };
  };

  private countByStatus = (keyword: string, fundType: string, status: FundCatalogImportStatus): number => {
    const filter = this.createPageFilter({
      keyword,
      fundType,
      status,
      sort: "relevance",
      order: "desc",
      limit: 1,
      offset: 0
    });
    const row = this.database.prepare(`SELECT COUNT(*) AS count ${filter.fromSql} ${filter.whereSql}`).get(...filter.params) as { count: number };
    return row.count;
  };

  private toEntry = (row: unknown): FundCatalogEntry => {
    const record = row as Record<string, number | string | null>;
    return {
      code: String(record.code),
      name: String(record.name),
      fundType: record.fund_type === null ? null : String(record.fund_type),
      pinyin: record.pinyin === null ? null : String(record.pinyin),
      fullPinyin: record.full_pinyin === null ? null : String(record.full_pinyin),
      source: "eastmoney",
      updatedAt: Number(record.updated_at)
    };
  };

  private toPageRecord = (row: unknown): FundCatalogPageRecord => {
    const record = row as Record<string, number | string | null>;
    return {
      ...this.toEntry(row),
      assetId: record.asset_id === null ? null : String(record.asset_id),
      latestNav: this.toNullableNumber(record.latest_nav),
      accumulatedNav: this.toNullableNumber(record.accumulated_nav),
      latestNavDate: record.latest_nav_date === null ? null : String(record.latest_nav_date),
      return1d: this.toNullableNumber(record.return_1d),
      return1w: this.toNullableNumber(record.return_1w),
      return1m: this.toNullableNumber(record.return_1m),
      return3m: this.toNullableNumber(record.return_3m),
      return6m: this.toNullableNumber(record.return_6m),
      return1y: this.toNullableNumber(record.return_1y),
      returnYtd: this.toNullableNumber(record.return_ytd),
      metricUpdatedAt: this.toNullableNumber(record.metric_updated_at)
    };
  };

  private toNullableNumber = (value: number | string | null): number | null => {
    if (value === null) {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };
}
