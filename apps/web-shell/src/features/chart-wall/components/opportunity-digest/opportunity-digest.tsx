import { Activity, ArrowRight, Compass, GitCompare, ShieldAlert, Sparkles } from "lucide-react";
import type { ChartWallItem } from "@gold-insights/market-domain";
import { SignalBadge } from "@gold-insights/ui";
import { OpportunityDigestBuilder, type OpportunityDigestAction, type OpportunityDigestCard } from "./opportunity-digest.builder";
import "./opportunity-digest.css";

type OpportunityDigestProps = {
  items: ChartWallItem[];
  onMarketSelect(market: string): void;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

const digestBuilder = new OpportunityDigestBuilder();

export function OpportunityDigest({ items, onMarketSelect, onSelect, onCompare }: OpportunityDigestProps): JSX.Element {
  const cards = digestBuilder.build(items);

  return (
    <section className="opportunity-digest" aria-label="机会摘要">
      <div className="opportunity-digest__heading">
        <div>
          <h2>机会摘要</h2>
          <p>把当前筛选结果先压缩成四个判断点，再进入市场、资产或风险细节。</p>
        </div>
        <SignalBadge label={`${items.length.toLocaleString("en-US")} 个资产`} tone="blue" />
      </div>

      <div className="opportunity-digest__grid">
        {cards.map((card) => (
          <DigestCard key={card.key} card={card} onAction={(action) => handleAction(action, onMarketSelect, onSelect)} onCompare={onCompare} />
        ))}
      </div>
    </section>
  );
}

function DigestCard({ card, onAction, onCompare }: { card: OpportunityDigestCard; onAction(action: OpportunityDigestAction): void; onCompare(assetId: string): void }): JSX.Element {
  const content = (
    <>
      <div className="opportunity-digest-card__topline">
        <span className="opportunity-digest-card__icon">{digestIcon(card.key)}</span>
        <span>{card.title}</span>
      </div>
      <div className="opportunity-digest-card__body">
        <span>{card.label}</span>
        <strong>{card.value}</strong>
        <p>{card.description}</p>
      </div>
      <div className="opportunity-digest-card__metric">
        <span>{card.metricLabel}</span>
        <SignalBadge label={card.metricValue} tone={card.metricTone} />
      </div>
    </>
  );

  return (
    <article className={`opportunity-digest-card opportunity-digest-card--${card.tone}`}>
      {card.action.kind === "none" ? (
        <div className="opportunity-digest-card__main opportunity-digest-card__main--static">{content}</div>
      ) : (
        <button type="button" className="opportunity-digest-card__main" onClick={() => onAction(card.action)} aria-label={actionLabel(card)}>
          {content}
          <ArrowRight className="opportunity-digest-card__arrow" size={16} aria-hidden="true" />
        </button>
      )}

      {card.compareAssetId && (
        <button type="button" className="opportunity-digest-card__compare" onClick={() => onCompare(card.compareAssetId!)} aria-label={`加入对比 ${card.value}`}>
          <GitCompare size={14} aria-hidden="true" />
          <span>对比</span>
        </button>
      )}
    </article>
  );
}

function handleAction(action: OpportunityDigestAction, onMarketSelect: (market: string) => void, onSelect: (assetId: string) => void): void {
  if (action.kind === "market") {
    onMarketSelect(action.market);
    return;
  }

  if (action.kind === "asset") {
    onSelect(action.assetId);
  }
}

function actionLabel(card: OpportunityDigestCard): string {
  if (card.action.kind === "market") {
    return `筛选 ${card.value}`;
  }

  if (card.action.kind === "asset") {
    return `查看 ${card.value} 详情`;
  }

  return card.value;
}

function digestIcon(key: OpportunityDigestCard["key"]): JSX.Element {
  if (key === "market") {
    return <Compass size={16} aria-hidden="true" />;
  }

  if (key === "leader") {
    return <Sparkles size={16} aria-hidden="true" />;
  }

  if (key === "activity") {
    return <Activity size={16} aria-hidden="true" />;
  }

  return <ShieldAlert size={16} aria-hidden="true" />;
}
