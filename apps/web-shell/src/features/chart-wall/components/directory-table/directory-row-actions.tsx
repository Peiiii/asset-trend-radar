import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, cn } from "@gold-insights/ui";
import "./directory-row-actions.css";

type DirectoryRowActionsProps = {
  children: ReactNode;
  className?: string;
};

type DirectoryActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  icon?: ReactNode;
  label: string;
  variant?: "secondary" | "ghost";
};

export function DirectoryRowActions({ children, className }: DirectoryRowActionsProps): JSX.Element {
  return <div className={cn("directory-row-actions", className)}>{children}</div>;
}

export function DirectoryActionButton({ icon, label, className, title, variant = "ghost", ...props }: DirectoryActionButtonProps): JSX.Element {
  const accessibleLabel = props["aria-label"] ?? title ?? label;

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("directory-action-button", className)}
      title={title ?? accessibleLabel}
      aria-label={accessibleLabel}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
