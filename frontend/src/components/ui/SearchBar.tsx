import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
}: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-base" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-field border border-line bg-surface',
          'pl-9 pr-9 text-sm text-ink placeholder:text-muted',
          'transition-colors focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-600/10',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
        >
          <i className="ri-close-circle-line text-base" />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
