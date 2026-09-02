import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Clase de Remix Icon, ej. "ri-add-line" */
  icon?: string;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600/30',
  secondary:
    'bg-surface text-ink border border-line hover:bg-brand-50 focus-visible:ring-brand-600/20',
  ghost: 'bg-transparent text-muted hover:bg-brand-50 hover:text-brand-600',
  danger: 'bg-danger text-white hover:brightness-110 focus-visible:ring-danger/30',
};

const TAMANOS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-field font-semibold whitespace-nowrap',
        'transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTES[variant],
        TAMANOS[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <i className="ri-loader-4-line animate-spin text-base" />
      ) : (
        icon && <i className={cn(icon, 'text-base leading-none')} />
      )}
      {children}
    </button>
  );
}

export default Button;
