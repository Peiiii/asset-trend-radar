import type { ValuationDisplay } from "../../utils/valuation-format.utils";
import "./valuation-stack.css";

type ValuationStackProps = {
  display: ValuationDisplay;
  showStatusBadge?: boolean;
};

export function ValuationStack({ display, showStatusBadge = false }: ValuationStackProps): JSX.Element {
  const detail = [display.detail, display.rankLabel].filter(Boolean).join(" / ");

  return (
    <div className={`valuation-stack valuation-stack--${display.status}`} title={display.title} aria-label={`${display.statusLabel}: ${display.label} ${detail}`}>
      {showStatusBadge && display.status !== "available" && display.statusLabel !== display.label && <span className="valuation-stack__status">{display.statusLabel}</span>}
      <span className="valuation-stack__main">
        <strong>{display.label}</strong>
        {display.hintLabel && <em>{display.hintLabel}</em>}
      </span>
      {detail.length > 0 && <small>{detail}</small>}
    </div>
  );
}
