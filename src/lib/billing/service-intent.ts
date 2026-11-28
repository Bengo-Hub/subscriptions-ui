const TAG = /^[a-z][a-z0-9_-]{1,31}$/;
const PLAN = /^[A-Z0-9_]{2,64}$/i;

/**
 * The service and plan an app sent the owner to billing for (`/billing?service=marketflow&plan=X`,
 * owner, 2026-11-28: every app's plan and upgrade links open the billing page). Anything that is not
 * a plain tag or plan code is ignored, so the link cannot inject text into the page.
 */
export function readServiceIntent(search: string): { service: string; plan?: string } | null {
  const q = new URLSearchParams(search);
  const service = (q.get('service') || '').toLowerCase();
  if (!TAG.test(service)) return null;
  const plan = q.get('plan') || '';
  return { service, plan: PLAN.test(plan) ? plan : undefined };
}

/** The plans page filtered to that service (and plan), where the owner picks the option. */
export function intentPlansHref(intent: { service: string; plan?: string }): string {
  return `/plans?service=${encodeURIComponent(intent.service)}${intent.plan ? `&plan=${encodeURIComponent(intent.plan)}` : ''}`;
}
