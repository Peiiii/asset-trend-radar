import type { DataHealthResponse } from "@gold-insights/market-domain";

export type HealthTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type DataFreshness = {
  label: string;
  description: string;
  tone: HealthTone;
};

export function getDataFreshness(latestBarAt: string | null): DataFreshness {
  if (!latestBarAt) {
    return { label: "未知", description: "没有最新 K 线时间", tone: "negative" };
  }

  const ageHours = Math.max((Date.now() - new Date(latestBarAt).getTime()) / 3_600_000, 0);

  if (ageHours <= 36) {
    return { label: "新鲜", description: `${ageHours.toFixed(1)} 小时前`, tone: "positive" };
  }

  if (ageHours <= 96) {
    return { label: "可用", description: `${(ageHours / 24).toFixed(1)} 天前`, tone: "amber" };
  }

  return { label: "偏旧", description: `${(ageHours / 24).toFixed(1)} 天前`, tone: "negative" };
}

export function providerTone(provider: DataHealthResponse["providers"][number]): HealthTone {
  if (provider.status === "active" && provider.assetCount > 0) {
    return "positive";
  }

  if (provider.status === "active") {
    return "amber";
  }

  if (provider.status === "reserved") {
    return "neutral";
  }

  return "negative";
}

export function jobTone(status: string | undefined): HealthTone {
  if (status === "success") {
    return "positive";
  }

  if (status === "running") {
    return "blue";
  }

  if (status === "failed") {
    return "negative";
  }

  return "neutral";
}

export function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

export function timeframeLabel(value: string): string {
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

export function jobStatusLabel(status: string): string {
  if (status === "running") {
    return "运行中";
  }

  if (status === "success") {
    return "成功";
  }

  if (status === "failed") {
    return "失败";
  }

  return status;
}
