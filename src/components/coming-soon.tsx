'use client';

import Link from 'next/link';
import { ArrowLeft, Hourglass, type LucideIcon } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-header';

/**
 * Placeholder for an area that is still being built. Shown instead of the half-finished page so
 * nobody relies on a workflow that is not ready (and nothing is sold that does not work yet).
 */
export function ComingSoon({ title, description, icon: Icon = Hourglass }: { title: string; description: string; icon?: LucideIcon }) {
  return (
    <PageContainer>
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
        <span className="mt-5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          Coming soon
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    </PageContainer>
  );
}
