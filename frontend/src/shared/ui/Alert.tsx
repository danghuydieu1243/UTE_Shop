import type { ReactNode } from 'react';
type Kind = 'success' | 'danger' | 'info' | 'warning';
const map: Record<Kind, string> = {
  success: 'bg-success-bg text-success-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  warning: 'bg-warning-bg text-warning-fg',
};
export const Alert = ({ kind = 'info', children }: { kind?: Kind; children: ReactNode }) => (
  <div className={`rounded px-4 py-3 text-sm ${map[kind]}`}>{children}</div>
);
