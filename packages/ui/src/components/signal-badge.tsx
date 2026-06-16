import { cn } from "../utils/class-name.utils";

type SignalBadgeProps = {
  label: string;
  tone?: "positive" | "negative" | "neutral" | "amber" | "blue";
};

export function SignalBadge({ label, tone = "neutral" }: SignalBadgeProps): JSX.Element {
  return <span className={cn("gi-signal-badge", `gi-signal-badge--${tone}`)}>{label}</span>;
}
