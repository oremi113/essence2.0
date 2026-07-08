import type { ReactNode } from 'react';
import { AppShell } from '@/components/ui/AppShell';

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
