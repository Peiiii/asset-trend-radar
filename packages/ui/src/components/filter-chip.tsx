import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/class-name.utils";

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function FilterChip({ className, label, onClick, type = "button", ...props }: FilterChipProps): JSX.Element {
  if (onClick) {
    return (
      <button type={type} className={cn("gi-filter-chip", "gi-filter-chip--button", className)} onClick={onClick} {...props}>
        {label}
      </button>
    );
  }

  return <span className={cn("gi-filter-chip", className)}>{label}</span>;
}
