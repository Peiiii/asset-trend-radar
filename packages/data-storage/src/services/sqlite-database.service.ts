import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class SqliteDatabaseService {
  private readonly database: DatabaseSync;

  public constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.initialize();
  }

  public getConnection = (): DatabaseSync => this.database;

  public close = (): void => {
    this.database.close();
  };

  private initialize = (): void => {
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA temp_store = MEMORY;

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        market TEXT NOT NULL,
        exchange TEXT,
        currency TEXT,
        universe TEXT,
        level TEXT,
        data_source TEXT,
        vendor_symbol TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        timezone TEXT NOT NULL,
        parent_id TEXT,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ohlcv_bars (
        asset_id TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        ts INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL,
        amount REAL,
        source TEXT NOT NULL,
        adjusted_type TEXT NOT NULL DEFAULT 'none',
        ingested_at INTEGER NOT NULL,
        PRIMARY KEY (asset_id, timeframe, ts, adjusted_type)
      );

      CREATE TABLE IF NOT EXISTS indicator_values (
        asset_id TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        ts INTEGER NOT NULL,
        ma20 REAL,
        ma50 REAL,
        ma200 REAL,
        ema12 REAL,
        ema26 REAL,
        macd_dif REAL,
        macd_dea REAL,
        macd_hist REAL,
        rsi14 REAL,
        calculated_at INTEGER NOT NULL,
        PRIMARY KEY (asset_id, timeframe, ts)
      );

      CREATE TABLE IF NOT EXISTS scan_events (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity INTEGER NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        triggered_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id TEXT PRIMARY KEY,
        vendor TEXT NOT NULL,
        dataset TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        error_message TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS fund_catalog (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        fund_type TEXT,
        pinyin TEXT,
        full_pinyin TEXT,
        source TEXT NOT NULL,
        latest_nav REAL,
        accumulated_nav REAL,
        latest_nav_date TEXT,
        return_1d REAL,
        return_1w REAL,
        return_1m REAL,
        return_3m REAL,
        return_6m REAL,
        return_1y REAL,
        return_ytd REAL,
        metric_updated_at INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provider_snapshots (
        key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS watchlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS watchlist_assets (
        watchlist_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (watchlist_id, asset_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ohlcv_lookup ON ohlcv_bars(asset_id, timeframe, adjusted_type, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_indicator_lookup ON indicator_values(asset_id, timeframe, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_events_lookup ON scan_events(timeframe, event_type, triggered_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_id);
      CREATE INDEX IF NOT EXISTS idx_assets_universe ON assets(universe, level, market);
      CREATE INDEX IF NOT EXISTS idx_fund_catalog_name ON fund_catalog(name);
      CREATE INDEX IF NOT EXISTS idx_fund_catalog_type ON fund_catalog(fund_type);
      CREATE INDEX IF NOT EXISTS idx_provider_snapshots_updated ON provider_snapshots(updated_at);
    `);
    this.addColumnIfMissing("assets", "universe", "TEXT");
    this.addColumnIfMissing("assets", "level", "TEXT");
    this.addColumnIfMissing("assets", "data_source", "TEXT");
    this.addColumnIfMissing("assets", "vendor_symbol", "TEXT");
    this.addColumnIfMissing("assets", "tags_json", "TEXT NOT NULL DEFAULT '[]'");
    this.addColumnIfMissing("fund_catalog", "latest_nav", "REAL");
    this.addColumnIfMissing("fund_catalog", "accumulated_nav", "REAL");
    this.addColumnIfMissing("fund_catalog", "latest_nav_date", "TEXT");
    this.addColumnIfMissing("fund_catalog", "return_1d", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_1w", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_1m", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_3m", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_6m", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_1y", "REAL");
    this.addColumnIfMissing("fund_catalog", "return_ytd", "REAL");
    this.addColumnIfMissing("fund_catalog", "metric_updated_at", "INTEGER");
  };

  private addColumnIfMissing = (tableName: string, columnName: string, columnDefinition: string): void => {
    const columns = this.database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;

    if (columns.some((column) => column.name === columnName)) {
      return;
    }

    this.database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  };
}
