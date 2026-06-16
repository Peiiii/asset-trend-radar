import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/class-name.utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, variant = "secondary", type = "button", ...props }: ButtonProps): JSX.Element {
  return (
    <button type={type} className={cn("gi-button", `gi-button--${variant}`, className)} {...props}>
      {children}
    </button>
  );
}
