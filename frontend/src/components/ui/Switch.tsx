import React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  className,
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-40',
          checked
            ? 'bg-sky-500'
            : 'bg-slate-300 dark:bg-slate-700',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0',
            'transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>

      {label && (
        <span
          onClick={handleClick}
          className={cn(
            'text-xs font-medium cursor-pointer select-none',
            disabled ? 'cursor-not-allowed opacity-50' : 'text-ink',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default Switch;
