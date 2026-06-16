import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, children }: AppShellProps): JSX.Element {
  return (
    <main className="gi-app-shell">
      <aside className="gi-sidebar">{sidebar}</aside>
      <section className="gi-workspace">{children}</section>
    </main>
  );
}
