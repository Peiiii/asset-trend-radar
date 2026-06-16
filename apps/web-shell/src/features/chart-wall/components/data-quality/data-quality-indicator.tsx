import type { ChartWallItem } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import "./data-quality-indicator.css";

type DataQualityIndicatorProps = {
  item: Pick<ChartWallItem, "source" | "latestBarAt" | "dataPointCount" | "firstBarAt">;
  compact?: boolean;
};

type DataQualityTone = "positive" | "amber" | "negative" | "neutral";

type DataQualityState = {
  tone: DataQualityTone;
  label: string;
  description: string;
};

export function DataQualityIndicator({ item, compact = false }: DataQualityIndicatorProps): JSX.Element {
  const state = getDataQualityState(item);
  const className = `data-quality-indicator data-quality-indicator--${state.tone}${compact ? " data-quality-indicator--compact" : ""}`;

  return (
    <div className={className} aria-label={`数据状态: ${state.label}，${state.description}`}>
      <span className="data-quality-indicator__status">{state.label}</span>
      <span>{item.source || "unknown"}</span>
      <span>{formatDateTime(item.latestBarAt)}</span>
      <span>{item.dataPointCount.toLocaleString("en-US")} 点</span>
    </div>
  );
}

function getDataQualityState(item: Pick<ChartWallItem, "latestBarAt" | "dataPointCount" | "firstBarAt">): DataQualityState {
  if (!item.latestBarAt || item.dataPointCount === 0) {
    return {
      tone: "negative",
      label: "无数据",
      description: "缺少可展示行情"
    };
  }

  if (item.dataPointCount < 20) {
    return {
      tone: "amber",
      label: "样本少",
      description: "数据点较少，指标参考性有限"
    };
  }

  const ageDays = getAgeDays(item.latestBarAt);

  if (ageDays === null) {
    return {
      tone: "neutral",
      label: "待确认",
      description: "无法判断最新行情时间"
    };
  }

  if (ageDays > 7) {
    return {
      tone: "negative",
      label: "明显滞后",
      description: "最新行情超过 7 天未更新"
    };
  }

  if (ageDays > 3) {
    return {
      tone: "amber",
      label: "略滞后",
      description: "最新行情超过 3 天未更新"
    };
  }

  return {
    tone: "positive",
    label: "数据新鲜",
    description: item.firstBarAt ? `覆盖 ${formatDateTime(item.firstBarAt)} 起的走势` : "最新行情在 3 天内"
  };
}

function getAgeDays(value: string): number | null {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, (Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}
