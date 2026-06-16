import type { DatabaseSync } from "node:sqlite";
import type { IndicatorPoint, OhlcvBar } from "@gold-insights/market-domain";

export class SqliteMarketDataRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public upsertBars = (bars: OhlcvBar[]): void => {
    const statement = this.database.prepare(`
      INSERT INTO ohlcv_bars (asset_id, timeframe, ts, open, high, low, close, volume, amount, source, adjusted_type, ingested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', ?)
      ON CONFLICT(asset_id, timeframe, ts, adjusted_type) DO UPDATE SET
        open = excluded.open,
        high = excluded.high,
        low = excluded.low,
        close = excluded.close,
        volume = excluded.volume,
        amount = excluded.amount,
        source = excluded.source,
        ingested_at = excluded.ingested_at
    `);
    const now = Date.now();

    for (const bar of bars) {
      statement.run(bar.assetId, bar.timeframe, bar.ts, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.amount, bar.source, now);
    }
  };

  public listBars = (assetId: string, timeframe: string, limit: number): OhlcvBar[] => {
    const rows = this.database
      .prepare(
        `SELECT asset_id, timeframe, ts, open, high, low, close, volume, amount, source
         FROM ohlcv_bars
         WHERE asset_id = ? AND timeframe = ?
         ORDER BY ts DESC
         LIMIT ?`
      )
      .all(assetId, timeframe, limit);

    return rows
      .reverse()
      .map((row) => {
        const record = row as Record<string, number | string | null>;
        return {
          assetId: String(record.asset_id),
          timeframe: record.timeframe as OhlcvBar["timeframe"],
          ts: Number(record.ts),
          open: Number(record.open),
          high: Number(record.high),
          low: Number(record.low),
          close: Number(record.close),
          volume: Number(record.volume ?? 0),
          amount: Number(record.amount ?? 0),
          source: String(record.source)
        };
      });
  };

  public upsertIndicators = (points: IndicatorPoint[]): void => {
    const statement = this.database.prepare(`
      INSERT INTO indicator_values
        (asset_id, timeframe, ts, ma20, ma50, ma200, ema12, ema26, macd_dif, macd_dea, macd_hist, rsi14, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asset_id, timeframe, ts) DO UPDATE SET
        ma20 = excluded.ma20,
        ma50 = excluded.ma50,
        ma200 = excluded.ma200,
        ema12 = excluded.ema12,
        ema26 = excluded.ema26,
        macd_dif = excluded.macd_dif,
        macd_dea = excluded.macd_dea,
        macd_hist = excluded.macd_hist,
        rsi14 = excluded.rsi14,
        calculated_at = excluded.calculated_at
    `);
    const now = Date.now();

    for (const point of points) {
      statement.run(
        point.assetId,
        point.timeframe,
        point.ts,
        point.ma20,
        point.ma50,
        point.ma200,
        point.ema12,
        point.ema26,
        point.macdDif,
        point.macdDea,
        point.macdHist,
        point.rsi14,
        now
      );
    }
  };

  public listIndicators = (assetId: string, timeframe: string, limit: number): IndicatorPoint[] => {
    const rows = this.database
      .prepare(
        `SELECT asset_id, timeframe, ts, ma20, ma50, ma200, ema12, ema26, macd_dif, macd_dea, macd_hist, rsi14
         FROM indicator_values
         WHERE asset_id = ? AND timeframe = ?
         ORDER BY ts DESC
         LIMIT ?`
      )
      .all(assetId, timeframe, limit);

    return rows
      .reverse()
      .map((row) => {
        const record = row as Record<string, number | string | null>;
        return {
          assetId: String(record.asset_id),
          timeframe: String(record.timeframe),
          ts: Number(record.ts),
          ma20: record.ma20 === null ? null : Number(record.ma20),
          ma50: record.ma50 === null ? null : Number(record.ma50),
          ma200: record.ma200 === null ? null : Number(record.ma200),
          ema12: record.ema12 === null ? null : Number(record.ema12),
          ema26: record.ema26 === null ? null : Number(record.ema26),
          macdDif: record.macd_dif === null ? null : Number(record.macd_dif),
          macdDea: record.macd_dea === null ? null : Number(record.macd_dea),
          macdHist: record.macd_hist === null ? null : Number(record.macd_hist),
          rsi14: record.rsi14 === null ? null : Number(record.rsi14)
        };
      });
  };

  public countBars = (): number => {
    const row = this.database.prepare("SELECT COUNT(*) AS count FROM ohlcv_bars").get() as { count: number };
    return row.count;
  };

  public countBarsByTimeframe = (): Array<{ timeframe: string; count: number }> =>
    this.database
      .prepare(
        `SELECT timeframe, COUNT(*) AS count
         FROM ohlcv_bars
         GROUP BY timeframe
         ORDER BY timeframe`
      )
      .all()
      .map((row) => {
        const record = row as Record<string, number | string>;
        return {
          timeframe: String(record.timeframe),
          count: Number(record.count)
        };
      });

  public countBarsBySource = (): Array<{ source: string; count: number }> =>
    this.database
      .prepare(
        `SELECT source, COUNT(*) AS count
         FROM ohlcv_bars
         GROUP BY source
         ORDER BY count DESC`
      )
      .all()
      .map((row) => {
        const record = row as Record<string, number | string>;
        return {
          source: String(record.source),
          count: Number(record.count)
        };
      });

  public latestBarTimestamp = (): number | null => {
    const row = this.database.prepare("SELECT MAX(ts) AS ts FROM ohlcv_bars").get() as { ts: number | null };
    return row.ts;
  };
}
