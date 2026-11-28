const TAG = /^[a-z][a-z0-9_-]{1,31}$/;
const PLAN = /^[A-Z0-9_]{2,64}$/i;

export interface ServiceIntent {
  service?: string;
  plan?: string;
}

/**
 * The service and plan an app sent the owner to billing for (`/billing?service=marketflow&plan=X`,
 * owner, 2026-11-28: every app's plan, upgrade and subscribe links open the billing page). Either
 * one may come alone. Anything that is not a plain tag or plan code is ignored, so the link cannot
 * inject text into the page.
 */
export function readServiceIntent(search: string): ServiceIntent | null {
  const q = new URLSearchParams(search);
  const rawService = (q.get('service') || '').toLowerCase();
  const rawPlan = q.get('plan') || '';
  const service = TAG.test(rawService) ? rawService : undefined;
  const plan = PLAN.test(rawPlan) ? rawPlan : undefined;
  return service || plan ? { service, plan } : null;
}

/**
 * Where the owner takes the next step: a named plan opens its checkout (the same as the public
 * pricing page's Subscribe), otherwise the plans page filtered to the service.
 */
export function intentNextHref(intent: ServiceIntent, included: boolean): string {
  if (intent.plan && !included) return `/subscribe?plan=${encodeURIComponent(intent.plan)}`;
  const q = new URLSearchParams();
  if (intent.service) q.set('service', intent.service);
  if (intent.plan) q.set('plan', intent.plan);
  const qs = q.toString();
  return qs ? `/plans?${qs}` : '/plans';
}
