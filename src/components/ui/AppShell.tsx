import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
