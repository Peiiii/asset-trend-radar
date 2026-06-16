import { cn } from "../utils/class-name.utils";

type TrendBadgeProps = {
  label: string;
  score: number;
};

export function TrendBadge({ label, score }: TrendBadgeProps): JSX.Element {
  const tone = score >= 10 ? "positive" : score <= -10 ? "negative" : "neutral";
  return <span className={cn("gi-trend-badge", `gi-trend-badge--${tone}`)}>{label}</span>;
}
