import type { DatabaseSync } from "node:sqlite";

export type ProviderSnapshot<TPayload> = {
  key: string;
  payload: TPayload;
  updatedAt: number;
};

export class SqliteProviderSnapshotRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public getSnapshot = <TPayload,>(key: string): ProviderSnapshot<TPayload> | null => {
    const row = this.database.prepare("SELECT key, payload_json, updated_at FROM provider_snapshots WHERE key = ?").get(key) as
      | { key: string; payload_json: string; updated_at: number }
      | undefined;

    if (!row) {
      return null;
    }

    try {
      return {
        key: row.key,
        payload: JSON.parse(row.payload_json) as TPayload,
        updatedAt: Number(row.updated_at)
      };
    } catch {
      return null;
    }
  };

  public upsertSnapshot = (key: string, payload: unknown, updatedAt = Date.now()): void => {
    this.database
      .prepare(
        `INSERT INTO provider_snapshots (key, payload_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(payload), updatedAt);
  };
}
