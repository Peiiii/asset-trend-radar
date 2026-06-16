import type { DatabaseSync } from "node:sqlite";
import type { FundCatalogEntry, FundCatalogSummary } from "@gold-insights/market-domain";

export class SqliteFundCatalogRepository {
  public constructor(private readonly database: DatabaseSync) {}

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

  public getSummary = (): FundCatalogSummary => {
    const row = this.database.prepare("SELECT COUNT(*) AS total_count, MAX(updated_at) AS synced_at FROM fund_catalog WHERE source = 'eastmoney'").get() as { total_count: number; synced_at: number | null };

    return {
      totalCount: row.total_count,
      syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
      source: "eastmoney"
    };
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
}
