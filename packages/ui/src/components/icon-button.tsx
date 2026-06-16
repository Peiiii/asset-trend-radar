import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/class-name.utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function IconButton({ children, className, label, type = "button", ...props }: IconButtonProps): JSX.Element {
  return (
    <button type={type} className={cn("gi-icon-button", className)} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
