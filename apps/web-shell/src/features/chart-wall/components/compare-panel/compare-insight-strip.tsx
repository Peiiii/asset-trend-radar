import type { CompareInsight } from "./compare-panel.utils";

type CompareInsightStripProps = {
  insights: CompareInsight[];
};

export function CompareInsightStrip({ insights }: CompareInsightStripProps): JSX.Element {
  return (
    <div className="compare-insight-strip" aria-label="对比洞察">
      {insights.map((insight) => (
        <article key={insight.id} className={`compare-insight-card compare-insight-card--${insight.tone}`}>
          <span>{insight.label}</span>
          <strong>{insight.value}</strong>
          <div>
            <b>{insight.title}</b>
            <small>{insight.detail}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
