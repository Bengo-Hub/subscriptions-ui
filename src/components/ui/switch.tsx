'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible name when there is no visible <label> pointing at this switch. */
  label?: string;
  id?: string;
  className?: string;
}

/** On/off switch in the tenant's primary colour (the brand tokens drive --primary). */
export function Switch({ checked, onCheckedChange, disabled, label, id, className }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

/** A labelled settings row: title and help text on the left, the switch on the right. */
export function SwitchRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
