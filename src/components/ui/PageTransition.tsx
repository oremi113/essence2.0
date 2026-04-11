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
    el.style.transform = 'translateY(8px)';

    const raf = requestAnimationFrame(() => {
      el.style.transition =
        'opacity 800ms cubic-bezier(0.4, 0.0, 0.2, 1), transform 800ms cubic-bezier(0.4, 0.0, 0.2, 1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
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
