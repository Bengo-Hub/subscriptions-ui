'use client';

import { AlertTriangle, Info, X } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' for irreversible actions, 'warning' for caution, 'info' for a plain pause. */
  variant?: 'danger' | 'warning' | 'info';
  /** Shows a busy confirm button and blocks closing while the action runs. */
  pending?: boolean;
  /** Disable confirm until the extra content (e.g. a typed confirmation) is satisfied. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/**
 * Confirm dialog for sensitive actions. Replaces native confirm() and inline "are you sure" rows.
 * A bottom sheet on phones and a centred card from sm up. Escape and the backdrop cancel, and
 * focus starts on Cancel so Enter never confirms a destructive action by accident.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  pending = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  const Icon = variant === 'info' ? Info : AlertTriangle;
  const tone = {
    danger: 'bg-destructive/10 text-destructive',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    info: 'bg-primary/10 text-primary',
  }[variant];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !pending && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-slide-up"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted sm:hidden" aria-hidden />
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-base font-bold text-foreground">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={onCancel} disabled={pending} className="h-11 sm:h-10">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className="h-11 sm:h-10"
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
