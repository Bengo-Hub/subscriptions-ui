import type { SubscriptionAddOn } from '@/types/subscription'
import type { InvoicePreview } from '@/types/billing'
import { groupLabel } from '@/lib/plans/catalog'
import { fmtDate, fmtMoney } from './format'

/**
 * Add-on logic for the billing and plans pages, kept free of React so it can be unit tested.
 * Add-ons are co-terminous with the main plan (owner decision, 27 November 2026): added mid-cycle
 * they are charged pro rata to the main renewal date, added during the main plan's trial they are
 * free until that trial ends and then billed with the main plan, and a KES 0 add-on starts at once.
 */

const CYCLE_SUFFIX: Record<string, string> = {
  MONTHLY: 'a month',
  QUARTERLY: 'every 3 months',
  SEMI_ANNUAL: 'every 6 months',
  ANNUAL: 'a year',
}

/** The add-on list from GET /subscription; older API builds have none. */
export function subscriptionAddOns(sub?: { add_ons?: SubscriptionAddOn[] | null } | null): SubscriptionAddOn[] {
  const list = sub?.add_ons
  return Array.isArray(list) ? list : []
}

/** The app name for a service tag; POS, Inventory and Ordering are sold as PowerSuite. */
export function serviceLabel(tag?: string | null): string {
  const t = (tag || '').toLowerCase()
  if (!t) return 'Platform'
  if (t === 'pos' || t === 'inventory' || t === 'ordering') return 'PowerSuite'
  return groupLabel(t.toUpperCase())
}

/** "KES 1,500 a month", or "Free" for a KES 0 add-on. */
export function addOnPriceLabel(a: Pick<SubscriptionAddOn, 'price' | 'currency' | 'billing_cycle'>): string {
  if (!a.price || a.price <= 0) return 'Free'
  const suffix = CYCLE_SUFFIX[(a.billing_cycle || '').toUpperCase()] ?? 'per billing period'
  return `${fmtMoney(a.price, a.currency || 'KES')} ${suffix}`
}

/** The renewal line under an add-on. */
export function addOnRenewalNote(a: SubscriptionAddOn, mainTrialEndsAt?: string | null): string {
  if (a.cancel_at_period_end) return `Removed. It stays on until ${fmtDate(a.current_period_end)}.`
  if (a.status === 'inactive') return 'Not active'
  if (a.status === 'trial') {
    const ends = a.trial_ends_at ?? mainTrialEndsAt
    return `Free until your trial ends on ${fmtDate(ends)}`
  }
  return `Renews with your plan on ${fmtDate(a.current_period_end)}`
}

export function canRemoveAddOn(a: SubscriptionAddOn): boolean {
  return a.status !== 'inactive' && !a.cancel_at_period_end
}

/** The add-ons the next bill charges for: paid ones that are on and not being removed. */
export function billableAddOns(addOns: SubscriptionAddOn[]): SubscriptionAddOn[] {
  return addOns.filter((a) => a.price > 0 && a.status !== 'inactive' && !a.cancel_at_period_end)
}

/**
 * The next bill's total with add-ons. While the invoice preview has no add-on figure of its own
 * (plan_addons_total_kes), its estimate covers the main plan only, so the add-ons are added here;
 * once the preview carries that figure its estimate is used as is.
 */
export function nextBillTotal(preview: InvoicePreview | undefined, addOns: SubscriptionAddOn[]): number | undefined {
  if (!preview) return undefined
  if (typeof preview.plan_addons_total_kes === 'number') return preview.estimated_total_kes
  return preview.estimated_total_kes + billableAddOns(addOns).reduce((s, a) => s + a.price, 0)
}

/**
 * The note under an "Add to my plan" button: the co-terminous rule only. The amount due now is
 * never worked out here. The API decides it (pro rata, a part already covered by the plan, or the
 * plan becoming the main plan) and the page shows its breakdown before anything is paid.
 */
export function addOnRuleNote(
  plan: { basePrice: number; currency?: string },
  main: { status: string | null; trial_ends_at?: string | null; current_period_end?: string | null },
): string {
  const currency = plan.currency || 'KES'
  if (!plan.basePrice || plan.basePrice <= 0) return 'Free. It is added to your plan at once.'
  const list = `${fmtMoney(plan.basePrice, currency)} a month`
  if (main.status === 'TRIAL' && main.trial_ends_at) {
    return `Free until your trial ends on ${fmtDate(main.trial_ends_at)}, then ${list} with your plan.`
  }
  return `Renews with your plan on ${fmtDate(main.current_period_end)}. List price ${list}; you pay only for the days to that date, and you see the exact amount before you pay.`
}

/** The price breakdown POST /subscription returns when it charges for a plan. */
export interface AddPlanBreakdown {
  fullPrice: number
  /** Value of the features the current plan already has. A share (0 to 1) when coveredIsShare. */
  covered: number
  coveredIsShare: boolean
  charged: number
  proratedTo?: string
  currency: string
}

export type AddPlanPayment =
  | { kind: 'intent'; intentId: string; initiateUrl?: string; amount: number }
  | { kind: 'redirect'; url: string }
  | { kind: 'invoice'; amount?: number }
  | { kind: 'none' }

export interface AddPlanResult {
  /** main_plan: the plan replaced the current one (a superset, handled as a plan change). */
  outcome: 'main_plan' | 'add_on'
  breakdown?: AddPlanBreakdown
  payment: AddPlanPayment
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/**
 * Reads the answer of POST /subscription for a plan of another service. Tolerant of the field
 * names the API settles on (see the report for the names assumed); unknown shapes read as a
 * plain add-on with nothing to pay.
 */
export function parseAddPlanResult(res: any): AddPlanResult {
  const r = res && typeof res === 'object' ? res : {}
  const tag = String(r.outcome ?? r.result ?? r.kind ?? r.action ?? '').toLowerCase()
  const outcome: AddPlanResult['outcome'] =
    r.became_main_plan === true || r.is_main_plan === true || ['main_plan', 'plan_change', 'became_main', 'main'].includes(tag)
      ? 'main_plan'
      : 'add_on'

  const b = r.breakdown ?? r.price_breakdown ?? r.pricing ?? null
  let breakdown: AddPlanBreakdown | undefined
  if (b && typeof b === 'object') {
    const fullPrice = num(b.full_price ?? b.full_price_kes ?? b.list_price)
    const charged = num(b.charged_amount ?? b.charged ?? b.charged_kes ?? b.amount_due)
    const covered = num(b.covered_amount ?? b.covered_kes ?? b.covered_share ?? b.covered) ?? 0
    if (fullPrice !== undefined && charged !== undefined) {
      breakdown = {
        fullPrice,
        charged,
        covered,
        coveredIsShare: b.covered_amount === undefined && b.covered_kes === undefined && covered > 0 && covered < 1,
        proratedTo: b.prorated_to ?? b.prorated_until ?? r.prorated_to ?? undefined,
        currency: b.currency ?? r.currency ?? 'KES',
      }
    }
  }

  let payment: AddPlanPayment = { kind: 'none' }
  if (r.intent_id) {
    payment = { kind: 'intent', intentId: String(r.intent_id), initiateUrl: r.initiate_url || undefined, amount: num(r.amount) ?? breakdown?.charged ?? 0 }
  } else if (r.authorization_url) {
    payment = { kind: 'redirect', url: String(r.authorization_url) }
  } else if (r.invoice || r.invoice_id || r.invoice_number) {
    payment = { kind: 'invoice', amount: num(r.amount_due ?? r.invoice?.amount_due ?? r.invoice?.total) ?? breakdown?.charged }
  }
  return { outcome, breakdown, payment }
}

/** One line per part of the breakdown, in the order a bill reads. */
export function breakdownLines(b: AddPlanBreakdown): { label: string; value: string }[] {
  const lines = [{ label: 'Full price', value: fmtMoney(b.fullPrice, b.currency) }]
  if (b.covered > 0) {
    lines.push({
      label: 'Already in your plan',
      value: b.coveredIsShare ? `${Math.round(b.covered * 100)}% of the features` : `−${fmtMoney(b.covered, b.currency)}`,
    })
  }
  lines.push({ label: b.proratedTo ? `You pay now, to ${fmtDate(b.proratedTo)}` : 'You pay now', value: fmtMoney(b.charged, b.currency) })
  return lines
}
