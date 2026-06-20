import type { ReactNode } from 'react';
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded border border-line bg-surface p-8 ${className}`}>{children}</div>
);
