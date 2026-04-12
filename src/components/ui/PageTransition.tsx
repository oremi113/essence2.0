'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = '0';

    const raf = requestAnimationFrame(() => {
      el.style.transition = 'opacity 400ms cubic-bezier(0.25, 0.1, 0.25, 1)';
      el.style.opacity = '1';
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className={`page-transition ${className}`}>
      {children}
    </div>
  );
}

export default PageTransition;
