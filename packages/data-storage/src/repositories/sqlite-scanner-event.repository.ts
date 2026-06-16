import type { DatabaseSync } from "node:sqlite";
import type { ScannerEvent } from "@gold-insights/market-domain";

export class SqliteScannerEventRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public replaceEventsForAsset = (assetId: string, events: ScannerEvent[]): void => {
    this.database.prepare("DELETE FROM scan_events WHERE asset_id = ?").run(assetId);
    const statement = this.database.prepare(`
      INSERT INTO scan_events (id, asset_id, timeframe, event_type, severity, title, summary, evidence_json, triggered_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = Date.now();

    for (const event of events) {
      statement.run(
        event.id,
        event.assetId,
        event.timeframe,
        event.eventType,
        event.severity,
        event.title,
        event.summary,
        JSON.stringify(event.evidence),
        event.triggeredAt,
        now
      );
    }
  };

  public listEventsForAsset = (assetId: string): ScannerEvent[] => {
    const rows = this.database
      .prepare(
        `SELECT id, asset_id, timeframe, event_type, severity, title, summary, evidence_json, triggered_at
         FROM scan_events
         WHERE asset_id = ?
         ORDER BY severity DESC, triggered_at DESC`
      )
      .all(assetId);

    return rows.map((row) => {
      const record = row as Record<string, number | string>;
      return {
        id: String(record.id),
        assetId: String(record.asset_id),
        timeframe: String(record.timeframe),
        eventType: record.event_type as ScannerEvent["eventType"],
        severity: Number(record.severity),
        title: String(record.title),
        summary: String(record.summary),
        evidence: JSON.parse(String(record.evidence_json)) as ScannerEvent["evidence"],
        triggeredAt: Number(record.triggered_at)
      };
    });
  };

  public listEvents = (): ScannerEvent[] => {
    const rows = this.database
      .prepare(
        `SELECT id, asset_id, timeframe, event_type, severity, title, summary, evidence_json, triggered_at
         FROM scan_events
         ORDER BY severity DESC, triggered_at DESC`
      )
      .all();

    return rows.map((row) => {
      const record = row as Record<string, number | string>;
      return {
        id: String(record.id),
        assetId: String(record.asset_id),
        timeframe: String(record.timeframe),
        eventType: record.event_type as ScannerEvent["eventType"],
        severity: Number(record.severity),
        title: String(record.title),
        summary: String(record.summary),
        evidence: JSON.parse(String(record.evidence_json)) as ScannerEvent["evidence"],
        triggeredAt: Number(record.triggered_at)
      };
    });
  };
}
