import { Activity, Database, HardDrive, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import { SignalBadge } from "@gold-insights/ui";
import type { ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { ValuationCoverageSummary } from "../valuation-coverage-summary/valuation-coverage-summary";
import { formatBytes, getDataFreshness, jobStatusLabel, jobTone, providerTone, timeframeLabel } from "./data-health-section.utils";
import "./data-health-section.css";

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
  const freshness = getDataFreshness(data.dataHealth.latestBarAt);
  const activeProviderCount = data.dataHealth.providers.filter((provider) => provider.status === "active" && provider.assetCount > 0).length;

  return (
    <section className="single-view-section data-health-section">
      <div className="section-title-row">
        <div>
          <h2>本地数据链路</h2>
          <p>SQLite / Raw JSONL / 多供应商真实数据 / 任务状态</p>
        </div>
      </div>

      <div className="data-health-hero">
        <DataHealthMetric icon={<Activity size={17} aria-hidden="true" />} label="数据新鲜度" value={freshness.label} description={freshness.description} tone={freshness.tone} />
        <DataHealthMetric icon={<ListChecks size={17} aria-hidden="true" />} label="资产覆盖" value={data.dataHealth.assetCount.toLocaleString("en-US")} description={`${activeProviderCount}/${data.dataHealth.providers.length} 个来源有资产`} tone={activeProviderCount > 0 ? "positive" : "negative"} />
        <DataHealthMetric icon={<Database size={17} aria-hidden="true" />} label="K 线数量" value={data.dataHealth.barCount.toLocaleString("en-US")} description={`最新 ${formatDateTime(data.dataHealth.latestBarAt)}`} tone={data.dataHealth.barCount > 0 ? "blue" : "negative"} />
        <DataHealthMetric icon={<HardDrive size={17} aria-hidden="true" />} label="本地存储" value={formatBytes(databaseSizeBytes)} description={`${rawFileCount.toLocaleString("en-US")} 个 raw 文件`} tone="neutral" />
      </div>

      <div className="data-health-grid">
        <DataHealthCard label="SQLite" value={data.dataHealth.databasePath} />
        <DataHealthCard label="Raw" value={data.dataHealth.rawDataPath} />
        <DataHealthCard label="最近记录任务" value={latestJob ? `${latestJob.vendor} / ${latestJob.dataset}` : "暂无"} />
        <DataHealthCard label="任务状态" value={latestJob ? `${jobStatusLabel(latestJob.status)} / ${formatDateTime(latestJobTime)}` : "暂无"} tone={jobTone(latestJob?.status)} />
        <DataHealthCard label="任务错误" value={latestJob?.errorMessage ?? "无"} tone={latestJob?.errorMessage ? "negative" : "positive"} />
      </div>

      <div className="provider-grid">
        {data.dataHealth.providers.map((provider) => (
          <article key={provider.id} className={`provider-card provider-card--${providerTone(provider)}`}>
            <ListChecks size={18} aria-hidden="true" />
            <strong>{provider.label}</strong>
            <SignalBadge label={provider.status} tone={providerTone(provider)} />
            <small>{provider.assetCount} 个资产</small>
          </article>
        ))}
      </div>
      <ValuationCoverageSummary items={data.chartWall.items} />
      <div className="data-health-split">
        <MiniCountTable title="按周期" rows={barsByTimeframe.map((row) => ({ label: timeframeLabel(row.timeframe), count: row.count }))} />
        <MiniCountTable title="按来源" rows={barsBySource.map((row) => ({ label: row.source, count: row.count }))} />
      </div>
      {assetTable}
    </section>
  );
}

function DataHealthMetric({ icon, label, value, description, tone }: { icon: ReactNode; label: string; value: string; description: string; tone: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <article className={`data-health-metric data-health-metric--${tone}`}>
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}

function DataHealthCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <article className={`data-health-card data-health-card--${tone}`}>
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
