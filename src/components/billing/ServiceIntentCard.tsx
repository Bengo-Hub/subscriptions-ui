'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { SectionCard } from '@/components/ui/page-header';
import { serviceLabel } from '@/lib/billing/addons';
import { intentPlansHref, readServiceIntent } from '@/lib/billing/service-intent';

/**
 * The service an app sent the owner here for (owner, 2026-11-28: every app's plan and upgrade links
 * open the billing page). Shown at the top: already in the plan, or the next step on the plans page,
 * filtered to that service (and plan) so the owner lands on the right option.
 */
export function ServiceIntentCard({ activeServiceTags }: { activeServiceTags?: string[] | null }) {
  const params = useSearchParams();
  const intent = readServiceIntent(params.toString());
  if (!intent) return null;
  const name = serviceLabel(intent.service);
  const included = (activeServiceTags ?? []).map((t) => t.toLowerCase()).includes(intent.service);
  const plansHref = intentPlansHref(intent);
  return (
    <SectionCard
      title={included ? `${name} is in your plan` : `Add ${name}`}
      icon={included ? CheckCircle2 : Sparkles}
      description={
        included
          ? `Your current plan already includes ${name}. To get more of it, compare the higher plans.`
          : `Your plan does not include ${name} yet. Pick the plan or add-on that adds it; you only pay for what your plan does not already cover.`
      }
      className="border-primary/30"
      action={
        <Link href={plansHref} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          {included ? `Compare ${name} plans` : `See ${name} options`}
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">Plans, add-ons and payment for every Codevertex app are managed on this page.</p>
    </SectionCard>
  );
}
