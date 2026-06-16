import type { DatabaseSync } from "node:sqlite";
import type { AssetSummary, WatchlistSummary } from "@gold-insights/market-domain";
import { SqliteAssetRepository } from "./sqlite-asset.repository";

export class SqliteWatchlistRepository {
  private readonly assetRepository: SqliteAssetRepository;

  public constructor(private readonly database: DatabaseSync) {
    this.assetRepository = new SqliteAssetRepository(database);
  }

  public ensureDefaultWatchlist = (): void => {
    const now = Date.now();
    this.database
      .prepare(
        `INSERT INTO watchlists (id, name, created_at, updated_at)
         VALUES ('default', '默认自选', ?, ?)
         ON CONFLICT(id) DO NOTHING`
      )
      .run(now, now);
  };

  public listWatchlists = (): WatchlistSummary[] => {
    this.ensureDefaultWatchlist();
    const rows = this.database.prepare("SELECT id, name FROM watchlists ORDER BY created_at").all() as Array<{ id: string; name: string }>;
    const assets = this.assetRepository.listAssets();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      assets: this.listAssetIds(row.id)
        .map((assetId) => assets.find((asset) => asset.id === assetId))
        .filter((asset): asset is AssetSummary => Boolean(asset))
    }));
  };

  public createWatchlist = (name: string): WatchlistSummary => {
    const id = `watchlist-${Date.now()}`;
    const now = Date.now();
    this.database.prepare("INSERT INTO watchlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, name, now, now);
    return {
      id,
      name,
      assets: []
    };
  };

  public addAsset = (watchlistId: string, assetId: string): void => {
    this.ensureDefaultWatchlist();
    const row = this.database.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS position FROM watchlist_assets WHERE watchlist_id = ?").get(watchlistId) as {
      position: number;
    };
    this.database
      .prepare(
        `INSERT INTO watchlist_assets (watchlist_id, asset_id, position)
         VALUES (?, ?, ?)
         ON CONFLICT(watchlist_id, asset_id) DO NOTHING`
      )
      .run(watchlistId, assetId, row.position);
  };

  public removeAsset = (watchlistId: string, assetId: string): void => {
    this.database.prepare("DELETE FROM watchlist_assets WHERE watchlist_id = ? AND asset_id = ?").run(watchlistId, assetId);
  };

  private listAssetIds = (watchlistId: string): string[] => {
    const rows = this.database
      .prepare("SELECT asset_id FROM watchlist_assets WHERE watchlist_id = ? ORDER BY position")
      .all(watchlistId) as Array<{ asset_id: string }>;
    return rows.map((row) => row.asset_id);
  };
}
