import { cn } from "../utils/class-name.utils";

type PriceChangeProps = {
  value: number | null;
  suffix?: string;
};

export function PriceChange({ value, suffix = "%" }: PriceChangeProps): JSX.Element {
  const direction = value === null ? "neutral" : value >= 0 ? "positive" : "negative";
  const text = value === null ? "暂无" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;

  return <span className={cn("gi-price-change", `gi-price-change--${direction}`)}>{text}</span>;
}
