import { useMemo } from "react";
import type { ChartWallItem } from "@gold-insights/market-domain";
import { ValuationCoverageSummaryBuilder } from "./valuation-coverage-summary.builder";
import "./valuation-coverage-summary.css";

type ValuationCoverageSummaryProps = {
  items: ChartWallItem[];
};

const summaryBuilder = new ValuationCoverageSummaryBuilder();

export function ValuationCoverageSummary({ items }: ValuationCoverageSummaryProps): JSX.Element {
  const summary = useMemo(() => summaryBuilder.build(items), [items]);
  const coverageLabel = `${Math.round(summary.coverageRatio * 100)}%`;

  return (
    <section className="valuation-coverage-summary" aria-label="估值覆盖">
      <div className="valuation-coverage-summary__header">
        <div>
          <h3>估值覆盖</h3>
          <p>市值空态按当前筛选口径统计；“源未返回 / 未接入源 / 不适用”都不是后台加载中。</p>
        </div>
        <strong>{coverageLabel}</strong>
      </div>

      <div className="valuation-coverage-summary__cards" aria-label="估值覆盖状态">
        {summary.statusCards.map((card) => (
          <article key={card.status} className={`valuation-coverage-card valuation-coverage-card--${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.count.toLocaleString("en-US")}</strong>
            <small>{card.description}</small>
          </article>
        ))}
      </div>

      <div className="valuation-coverage-summary__body">
        <article className="valuation-coverage-panel">
          <h4>按市场</h4>
          <div className="valuation-coverage-table" role="table" aria-label="按市场估值覆盖">
            {summary.marketRows.map((row) => (
              <div key={row.market} role="row" className="valuation-coverage-table__row">
                <span>{row.market}</span>
                <strong>{`${row.sortableCount}/${row.totalCount}`}</strong>
                <small>{`缺规模 ${row.missingCount} / 不适用 ${row.notApplicableCount}`}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="valuation-coverage-panel">
          <h4>空态来源</h4>
          <div className="valuation-coverage-source-list">
            {summary.sourceRows.length > 0 ? summary.sourceRows.map((row) => (
              <div key={row.label} className={`valuation-coverage-source valuation-coverage-source--${row.tone}`}>
                <span>{row.label}</span>
                <strong>{row.count.toLocaleString("en-US")}</strong>
                <small>{row.description}</small>
                {row.examples.length > 0 && <em>{row.examples.join(" / ")}</em>}
              </div>
            )) : (
              <div className="valuation-coverage-source valuation-coverage-source--positive">
                <span>暂无空态</span>
                <strong>{summary.totalCount.toLocaleString("en-US")}</strong>
                <small>当前筛选资产都有可用规模或成交额快照</small>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
