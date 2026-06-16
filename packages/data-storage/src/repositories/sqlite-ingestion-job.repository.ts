import type { DatabaseSync } from "node:sqlite";
import type { IngestionJobStatus, IngestionJobSummary } from "../types/ingestion-job.types";

export class SqliteIngestionJobRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public startJob = (id: string, vendor: string, dataset: string, metadata: Record<string, unknown>): void => {
    this.database
      .prepare(
        `INSERT INTO ingestion_jobs (id, vendor, dataset, status, started_at, finished_at, error_message, metadata_json)
         VALUES (?, ?, ?, 'running', ?, NULL, NULL, ?)`
      )
      .run(id, vendor, dataset, Date.now(), JSON.stringify(metadata));
  };

  public finishJob = (id: string, status: IngestionJobStatus, errorMessage: string | null): void => {
    this.database
      .prepare("UPDATE ingestion_jobs SET status = ?, finished_at = ?, error_message = ? WHERE id = ?")
      .run(status, Date.now(), errorMessage, id);
  };

  public getLatestJob = (): IngestionJobSummary | null => {
    const row = this.database
      .prepare(
        `SELECT id, vendor, dataset, status, started_at, finished_at, error_message
         FROM ingestion_jobs
         ORDER BY started_at DESC
         LIMIT 1`
      )
      .get();

    return this.toSummary(row);
  };

  public getLatestFinishedJob = (): IngestionJobSummary | null => {
    const row = this.database
      .prepare(
        `SELECT id, vendor, dataset, status, started_at, finished_at, error_message
         FROM ingestion_jobs
         WHERE finished_at IS NOT NULL
         ORDER BY finished_at DESC
         LIMIT 1`
      )
      .get();

    return this.toSummary(row);
  };

  private toSummary = (row: unknown): IngestionJobSummary | null => {
    if (!row) {
      return null;
    }

    const record = row as Record<string, number | string | null>;
    return {
      id: String(record.id),
      vendor: String(record.vendor),
      dataset: String(record.dataset),
      status: record.status as IngestionJobStatus,
      startedAt: record.started_at === null ? null : Number(record.started_at),
      finishedAt: record.finished_at === null ? null : Number(record.finished_at),
      errorMessage: record.error_message === null ? null : String(record.error_message)
    };
  };
}
