'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { SectionCard } from '@/components/ui/page-header';
import { serviceLabel } from '@/lib/billing/addons';
import { intentNextHref, readServiceIntent } from '@/lib/billing/service-intent';

/**
 * The app or plan another Codevertex app sent the owner here for (owner, 2026-11-28: every app's
 * plan, upgrade and subscribe links open the billing page). Shown at the top: the app already in
 * the plan, or the next step: the named plan's checkout, or the plans page filtered to the app.
 */
export function ServiceIntentCard({ activeServiceTags }: { activeServiceTags?: string[] | null }) {
  const params = useSearchParams();
  const intent = readServiceIntent(params.toString());
  if (!intent) return null;
  const name = intent.service ? serviceLabel(intent.service) : intent.plan!.replace(/_/g, ' ');
  const included = !!intent.service && (activeServiceTags ?? []).map((t) => t.toLowerCase()).includes(intent.service);
  const href = intentNextHref(intent, included);
  return (
    <SectionCard
      title={included ? `${name} is in your plan` : intent.service ? `Add ${name}` : `Subscribe to ${name}`}
      icon={included ? CheckCircle2 : Sparkles}
      description={
        included
          ? `Your current plan already includes ${name}. To get more of it, compare the higher plans.`
          : intent.service
            ? `Your plan does not include ${name} yet. Pick the plan or add-on that adds it; you only pay for what your plan does not already cover.`
            : 'Review the plan and pay to start it. Your other apps and add-ons stay as they are.'
      }
      className="border-primary/30"
      action={
        <Link href={href} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          {included ? `Compare ${name} plans` : intent.plan ? 'Continue' : `See ${name} options`}
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">Plans, add-ons and payment for every Codevertex app are managed on this page.</p>
    </SectionCard>
  );
}
