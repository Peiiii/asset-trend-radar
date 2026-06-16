import type { DatabaseSync } from "node:sqlite";
import type { AssetSummary } from "@gold-insights/market-domain";

export class SqliteAssetRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public upsertAssets = (assets: AssetSummary[]): void => {
    const statement = this.database.prepare(`
      INSERT INTO assets
        (id, symbol, name, asset_type, market, exchange, currency, universe, level, data_source, vendor_symbol, tags_json, timezone, parent_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        symbol = excluded.symbol,
        name = excluded.name,
        asset_type = excluded.asset_type,
        market = excluded.market,
        exchange = excluded.exchange,
        currency = excluded.currency,
        universe = excluded.universe,
        level = excluded.level,
        data_source = excluded.data_source,
        vendor_symbol = excluded.vendor_symbol,
        tags_json = excluded.tags_json,
        parent_id = excluded.parent_id,
        updated_at = excluded.updated_at
    `);
    const now = Date.now();

    for (const asset of assets) {
      statement.run(
        asset.id,
        asset.symbol,
        asset.name,
        asset.assetType,
        asset.market,
        asset.exchange,
        asset.currency,
        asset.universe ?? "global",
        asset.level ?? "instrument",
        asset.dataSource ?? "yahoo",
        asset.vendorSymbol ?? asset.symbol,
        JSON.stringify(asset.tags ?? []),
        "UTC",
        asset.parentId ?? null,
        now,
        now
      );
    }
  };

  public listAssets = (): AssetSummary[] => {
    const rows = this.database
      .prepare(
        `SELECT id, symbol, name, asset_type, market, exchange, currency, universe, level, data_source, vendor_symbol, tags_json, parent_id
         FROM assets
         ORDER BY market, level, id`
      )
      .all();
    return rows.map((row) => {
      const record = row as Record<string, string | null>;
      return {
        id: String(record.id),
        symbol: String(record.symbol),
        name: String(record.name),
        assetType: record.asset_type as AssetSummary["assetType"],
        market: String(record.market),
        exchange: String(record.exchange ?? ""),
        currency: String(record.currency ?? ""),
        universe: String(record.universe ?? "global"),
        level: record.level as AssetSummary["level"],
        dataSource: record.data_source as AssetSummary["dataSource"],
        vendorSymbol: String(record.vendor_symbol ?? record.symbol),
        tags: JSON.parse(String(record.tags_json ?? "[]")) as string[],
        parentId: record.parent_id
      };
    });
  };

  public getAsset = (assetId: string): AssetSummary | null => this.listAssets().find((asset) => asset.id === assetId) ?? null;

  public listAssetsByParent = (parentId: string | null): AssetSummary[] =>
    this.listAssets().filter((asset) => (parentId === null ? asset.parentId === null : asset.parentId === parentId));
}
