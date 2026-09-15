import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-copper text-ink font-medium hover:brightness-110 active:brightness-95 shadow-raise',
  secondary:
    'glass border text-limestone hover:border-copper/50 hover:text-copper',
  ghost: 'text-steel hover:bg-steel/10 hover:text-limestone',
  danger: 'bg-critical/12 text-critical border border-critical/35 hover:bg-critical/20',
  quiet: 'text-steel hover:text-limestone underline decoration-hairline underline-offset-4',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-control',
  md: 'h-10 px-4 text-sm gap-2 rounded-control',
  lg: 'h-12 px-5 text-base gap-2 rounded-control',
  icon: 'h-9 w-9 rounded-control',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-[filter,background-color,border-color,color] duration-150 ease-swift disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

// ---------- Surfaces ----------

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('panel', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  hint,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-limestone">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-steel">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ---------- Badge ----------

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium',
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dot)} /> : null}
      {children}
    </span>
  );
}

// ---------- Progress ----------

export function ProgressBar({
  percent,
  className,
  tone = 'bg-teal',
  label,
}: {
  percent: number;
  className?: string;
  tone?: string;
  label?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-steel/15', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${value}% complete`}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300 ease-swift', tone)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 132,
  stroke = 10,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-steel/18"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-teal transition-[stroke-dashoffset] duration-500 ease-swift"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

// ---------- States ----------

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-steel">{icon}</div> : null}
      <h3 className="font-display text-lg text-limestone">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-steel">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-steel/30 border-t-copper',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ---------- Switch ----------

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4 py-2.5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm text-limestone">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-steel">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-copper/60 bg-copper/70' : 'border-hairline bg-steel/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-limestone transition-transform duration-200 ease-swift',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </label>
  );
}

// ---------- Segmented control ----------

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex gap-0.5 rounded-control border bg-steel/5 p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-sm transition-colors',
              active
                ? 'bg-surface text-limestone shadow-raise'
                : 'text-steel hover:text-limestone',
            )}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sr-only sm:hidden">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Checkbox ----------

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  indeterminate,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  className?: string;
  indeterminate?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center rounded-[7px] border transition-colors duration-150',
        checked || indeterminate
          ? 'border-teal bg-teal text-ink'
          : 'border-steel/50 hover:border-copper',
        className,
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2.5 rounded-full bg-ink" />
      ) : checked ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
