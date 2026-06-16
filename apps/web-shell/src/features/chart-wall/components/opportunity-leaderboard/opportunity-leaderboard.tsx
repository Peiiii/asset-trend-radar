import { GitCompare, LineChart } from "lucide-react";
import { EmptyState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import "./opportunity-leaderboard.css";

type OpportunityLeaderboardProps = {
  items: ChartWallItem[];
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

type LeaderboardMetric = {
  label: string;
  value: string;
  numericValue: number | null;
  tone: "positive" | "negative" | "neutral" | "amber" | "blue";
};

type LeaderboardGroup = {
  key: string;
  title: string;
  description: string;
  items: Array<{ item: ChartWallItem; metric: LeaderboardMetric }>;
};

export function OpportunityLeaderboard({ items, onSelect, onCompare }: OpportunityLeaderboardProps): JSX.Element {
  const groups = createLeaderboardGroups(items);

  if (items.length === 0) {
    return <EmptyState title="暂无机会榜单" description="当前筛选没有资产，无法生成机会榜单。" />;
  }

  return (
    <section className="opportunity-leaderboard" aria-label="机会榜单">
      <div className="opportunity-leaderboard__header">
        <div>
          <h2>机会榜单</h2>
          <p>基于当前筛选结果，把涨幅、趋势、量能和事件自动提炼成可扫视榜单。</p>
        </div>
        <span>
          <LineChart size={14} aria-hidden="true" />
          {items.length.toLocaleString("en-US")} 个资产
        </span>
      </div>

      <div className="opportunity-leaderboard__grid">
        {groups.map((group) => (
          <LeaderboardPanel key={group.key} group={group} onSelect={onSelect} onCompare={onCompare} />
        ))}
      </div>
    </section>
  );
}

function LeaderboardPanel({ group, onSelect, onCompare }: { group: LeaderboardGroup; onSelect(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  return (
    <article className="opportunity-panel">
      <header>
        <div>
          <h3>{group.title}</h3>
          <p>{group.description}</p>
        </div>
      </header>
      {group.items.length === 0 ? (
        <p className="opportunity-panel__empty">当前筛选缺少可排名数据</p>
      ) : (
        <div className="opportunity-panel__rows">
          {group.items.map(({ item, metric }, index) => (
            <div key={item.id} className="opportunity-row">
              <button type="button" className="opportunity-row__identity" onClick={() => onSelect(item.id)}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <small>{item.symbol} / {item.market}</small>
              </button>
              <div className="opportunity-row__metric">
                <span>{metric.label}</span>
                {metric.label.includes("涨幅") || metric.label.includes("回撤") ? (
                  <PriceChange value={metric.numericValue} />
                ) : (
                  <SignalBadge label={metric.value} tone={metric.tone} />
                )}
              </div>
              <button type="button" className="opportunity-row__compare" onClick={() => onCompare(item.id)} aria-label={`加入对比 ${item.name}`}>
                <GitCompare size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function createLeaderboardGroups(items: ChartWallItem[]): LeaderboardGroup[] {
  return [
    {
      key: "return-1m-leaders",
      title: "1M 领涨",
      description: "近期收益最强",
      items: topBy(items, (item) => item.return1m, "desc").map((item) => ({
        item,
        metric: percentMetric("1M 涨幅", item.return1m)
      }))
    },
    {
      key: "return-1m-laggards",
      title: "1M 承压",
      description: "反向观察与回撤线索",
      items: topBy(items, (item) => item.return1m, "asc").map((item) => ({
        item,
        metric: percentMetric("1M 涨幅", item.return1m)
      }))
    },
    {
      key: "trend-score",
      title: "趋势最强",
      description: "趋势分靠前",
      items: topBy(items, (item) => item.trendScore, "desc").map((item) => ({
        item,
        metric: {
          label: "趋势分",
          value: `${item.trendScore}`,
          numericValue: item.trendScore,
          tone: item.trendScore >= 60 ? "positive" : item.trendScore >= 35 ? "blue" : "neutral"
        }
      }))
    },
    {
      key: "volume-ratio",
      title: "量能异动",
      description: "相对 20 日均量放大",
      items: topBy(items, (item) => item.volumeRatio, "desc").map((item) => ({
        item,
        metric: {
          label: "量比",
          value: item.volumeRatio === null ? "暂无" : `${item.volumeRatio.toFixed(2)}x`,
          numericValue: item.volumeRatio,
          tone: (item.volumeRatio ?? 0) >= 1.5 ? "amber" : "neutral"
        }
      }))
    },
    {
      key: "event-count",
      title: "事件密集",
      description: "扫描事件最多",
      items: topBy(items, (item) => item.events.length, "desc").map((item) => ({
        item,
        metric: {
          label: "事件",
          value: `${item.events.length}`,
          numericValue: item.events.length,
          tone: item.events.length > 0 ? "amber" : "neutral"
        }
      }))
    }
  ];
}

function topBy(items: ChartWallItem[], getValue: (item: ChartWallItem) => number | null | undefined, order: "asc" | "desc"): ChartWallItem[] {
  return [...items]
    .filter((item) => {
      const value = getValue(item);
      return typeof value === "number" && Number.isFinite(value);
    })
    .sort((left, right) => {
      const leftValue = getValue(left) ?? 0;
      const rightValue = getValue(right) ?? 0;
      return order === "desc" ? rightValue - leftValue : leftValue - rightValue;
    })
    .slice(0, 5);
}

function percentMetric(label: string, value: number | null): LeaderboardMetric {
  return {
    label,
    value: value === null ? "暂无" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
    numericValue: value,
    tone: value === null ? "neutral" : value >= 0 ? "positive" : "negative"
  };
}
