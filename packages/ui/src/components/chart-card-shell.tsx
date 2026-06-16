import type { ReactNode } from "react";
import { cn } from "../utils/class-name.utils";

type ChartCardShellProps = {
  children: ReactNode;
  className?: string;
};

export function ChartCardShell({ children, className }: ChartCardShellProps): JSX.Element {
  return <article className={cn("gi-chart-card", className)}>{children}</article>;
}
