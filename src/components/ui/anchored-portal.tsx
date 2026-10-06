'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface AnchoredPortalProps {
  /** The trigger the panel hangs off (its bottom-left, or bottom-right when align="end"). */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Panel width in px, needed up front so it can be kept inside the viewport. */
  width: number;
  align?: 'start' | 'end';
  className?: string;
  children: ReactNode;
}

/**
 * Renders a dropdown panel on <body>, positioned (fixed) under its trigger. Use it for any
 * dropdown opened from the header, a sticky bar, the sidebar drawer or a card: an
 * `absolute top-full` panel inside an overflow-hidden, blurred or transformed ancestor gets
 * clipped. Same component as treasury-ui and inventory-ui (2026-09-24 header-clipping fix).
 */
export function AnchoredPortal({ anchorRef, open, onClose, width, align = 'start', className, children }: AnchoredPortalProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - 16);
    const raw = align === 'end' ? r.right - w : r.left;
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(raw, window.innerWidth - w - 8)), width: w });
  }, [anchorRef, width, align]);

  // Measured before paint on every open, so a reopened panel never flashes at a stale spot.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, place, onClose]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} aria-hidden />
      <div
        className={cn('fixed z-[91] flex flex-col rounded-xl border border-border bg-popover shadow-xl', className)}
        style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: `calc(100dvh - ${pos.top + 8}px)` }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
