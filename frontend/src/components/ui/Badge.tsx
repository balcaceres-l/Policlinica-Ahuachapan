import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'royal' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  /** Muestra un punto de color a la izquierda */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANTES: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  royal: 'bg-royal-soft text-royal',
  default: 'bg-canvas text-muted border border-line',
};

const PUNTOS: Record<BadgeVariant, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  royal: 'bg-royal',
  default: 'bg-muted',
};

export function Badge({ variant = 'default', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-xs font-semibold leading-none whitespace-nowrap',
        VARIANTES[variant],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', PUNTOS[variant])} />}
      {children}
    </span>
  );
}

export default Badge;
