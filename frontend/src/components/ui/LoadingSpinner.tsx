import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label = 'Cargando...', className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <span className="size-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export default LoadingSpinner;
