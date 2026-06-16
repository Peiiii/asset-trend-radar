import { ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import type { ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";

type DataHealthSectionProps = {
  data: ChartWallPageData;
  assetTable: ReactNode;
};

export function DataHealthSection({ data, assetTable }: DataHealthSectionProps): JSX.Element {
  const latestJob = data.dataHealth.latestJob ?? null;
  const latestJobTime = latestJob?.finishedAt ?? latestJob?.startedAt ?? null;
  const rawFileCount = data.dataHealth.rawFileCount ?? 0;
  const databaseSizeBytes = data.dataHealth.databaseSizeBytes ?? 0;
  const barsByTimeframe = data.dataHealth.barsByTimeframe ?? [];
  const barsBySource = data.dataHealth.barsBySource ?? [];

  return (
    <section className="single-view-section">
      <div className="section-title-row">
        <div>
          <h2>本地数据链路</h2>
          <p>SQLite / Raw JSONL / 多供应商真实数据</p>
        </div>
      </div>
      <div className="data-health-grid">
        <DataHealthCard label="SQLite" value={data.dataHealth.databasePath} />
        <DataHealthCard label="Raw" value={data.dataHealth.rawDataPath} />
        <DataHealthCard label="数据库大小" value={formatBytes(databaseSizeBytes)} />
        <DataHealthCard label="Raw 文件数" value={rawFileCount.toLocaleString("en-US")} />
        <DataHealthCard label="同步任务" value={latestJob ? `${jobStatusLabel(latestJob.status)} / ${formatDateTime(latestJobTime)}` : "暂无"} />
        <DataHealthCard label="任务错误" value={latestJob?.errorMessage ?? "无"} />
      </div>
      <div className="provider-grid">
        {data.dataHealth.providers.map((provider) => (
          <article key={provider.id}>
            <ListChecks size={18} aria-hidden="true" />
            <strong>{provider.label}</strong>
            <span>{provider.status}</span>
            <small>{provider.assetCount} 个资产</small>
          </article>
        ))}
      </div>
      <div className="data-health-split">
        <MiniCountTable title="按周期" rows={barsByTimeframe.map((row) => ({ label: timeframeLabel(row.timeframe), count: row.count }))} />
        <MiniCountTable title="按来源" rows={barsBySource.map((row) => ({ label: row.source, count: row.count }))} />
      </div>
      {assetTable}
    </section>
  );
}

function jobStatusLabel(status: string): string {
  if (status === "running") {
    return "同步中";
  }

  if (status === "success") {
    return "成功";
  }

  if (status === "failed") {
    return "失败";
  }

  return status;
}

function DataHealthCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MiniCountTable({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }): JSX.Element {
  return (
    <article className="mini-count-table">
      <h3>{title}</h3>
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{row.count.toLocaleString("en-US")}</strong>
        </div>
      ))}
    </article>
  );
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

function timeframeLabel(value: string): string {
  const labels: Record<string, string> = {
    "15m": "15m",
    "1h": "1H",
    "4h": "4H",
    "1d": "日线",
    "1w": "周线",
    "1mo": "月线"
  };
  return labels[value] ?? value;
}
