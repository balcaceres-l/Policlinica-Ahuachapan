import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Clase de Remix Icon */
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = 'ri-inbox-line',
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-400">
        <i className={cn(icon, 'text-2xl')} />
      </span>
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
