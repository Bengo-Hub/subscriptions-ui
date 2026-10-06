import type { BillingInfo, Invoice } from '@/types/billing'

/**
 * Billing page logic, kept free of React so it can be unit tested. The page leads with one
 * question a non-technical owner can act on: "do I owe anything, and how do I pay it?".
 * (2026-10-05: a tenant admin with an open invoice could not find how to pay it and set up a
 * card verification four times instead, because the page opened on "Add payment method".)
 */

/** One thing the tenant can pay right now: a subscription invoice or a support charge. */
export interface OpenBill {
  key: string
  kind: 'subscription' | 'support'
  label: string
  reference?: string
  amountDue: number
  currency: string
  dueDate?: string
  overdue: boolean
  payUrl?: string
  pdfUrl?: string
}

/** How to take a payment: in-app checkout modal, or treasury's own page in a new tab. */
export type PayTarget =
  | {
      mode: 'modal'
      intentId: string
      tenant: string
      amount: number
      currency: string
      referenceId?: string
      referenceType?: string
    }
  | { mode: 'link'; href: string }

export type StandingKind =
  | 'owes' // at least one open bill
  | 'suspended' // lapsed and nothing invoiced: renew to restore
  | 'renew_due' // period ends within RENEW_WINDOW_DAYS or has passed
  | 'cancelling' // cancelled, runs to period end
  | 'paid' // nothing owed, renews later
  | 'perpetual' // one-time licence, never renews
  | 'none' // no subscription

export interface AccountStanding {
  kind: StandingKind
  bills: OpenBill[]
  totalDue: number
  currency: string
  /** Days until the period ends (negative once it has passed). */
  daysLeft?: number
}

export const RENEW_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
const SETTLED = new Set(['paid', 'void', 'cancelled', 'credited'])

/** What is still owed on an invoice. Falls back to the full amount when nothing was recorded. */
export function invoiceAmountDue(inv: Invoice): number {
  if (SETTLED.has(String(inv.status).toLowerCase())) return 0
  const paid = inv.amountPaid ?? 0
  return Math.max(0, round2(inv.amount - paid))
}

/** Subscription invoices and support charges the tenant can pay now, oldest first. */
export function openBills(billing: BillingInfo | undefined): OpenBill[] {
  if (!billing) return []
  const bills: OpenBill[] = []
  for (const inv of billing.invoices ?? []) {
    const due = invoiceAmountDue(inv)
    if (due <= 0) continue
    bills.push({
      key: `inv:${inv.id}`,
      kind: 'subscription',
      label: billing.planName ? `${billing.planName} subscription` : inv.description || 'Subscription',
      reference: inv.id,
      amountDue: due,
      currency: inv.currency || billing.currency || 'KES',
      dueDate: inv.date,
      // inv.date is the issue date (always past), so only treasury's own status says overdue.
      overdue: String(inv.status).toLowerCase() === 'overdue',
      payUrl: inv.payUrl,
      pdfUrl: inv.pdfUrl,
    })
  }
  for (const c of billing.supportCharges ?? []) {
    // A PENDING charge has no invoice yet, so there is nothing to pay until it is issued.
    if (c.status === 'PENDING' && !c.payUrl) continue
    bills.push({
      key: `sup:${c.id}`,
      kind: 'support',
      label: c.name || 'Support and hosting',
      reference: c.invoiceNumber,
      amountDue: Number(c.invoiceTotal ?? c.amount) || 0,
      currency: c.currency || 'KES',
      dueDate: c.dueDate,
      overdue: c.status === 'OVERDUE' || c.blocking,
      payUrl: c.payUrl,
      pdfUrl: c.pdfUrl,
    })
  }
  return bills
    .filter((b) => b.amountDue > 0)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
}

export function accountStanding(billing: BillingInfo | undefined, now: Date = new Date()): AccountStanding {
  const bills = openBills(billing)
  const currency = bills[0]?.currency ?? billing?.currency ?? 'KES'
  const totalDue = round2(bills.reduce((s, b) => s + b.amountDue, 0))
  const end = billing?.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : undefined
  const daysLeft = end && !Number.isNaN(end.getTime()) ? Math.ceil((end.getTime() - now.getTime()) / DAY_MS) : undefined
  const base = { bills, totalDue, currency, daysLeft }

  if (!billing?.hasSubscription) return { kind: 'none', ...base }
  if (bills.length > 0) return { kind: 'owes', ...base }
  if (billing.isPerpetual) return { kind: 'perpetual', ...base }
  const status = String(billing.status ?? '').toUpperCase()
  if (['SUSPENDED', 'EXPIRED', 'PAST_DUE', 'CANCELLED'].includes(status)) return { kind: 'suspended', ...base }
  if (billing.cancelAtPeriodEnd) return { kind: 'cancelling', ...base }
  if (billing.billingMode !== 'service_charge' && daysLeft !== undefined && daysLeft <= RENEW_WINDOW_DAYS) {
    return { kind: 'renew_due', ...base }
  }
  return { kind: 'paid', ...base }
}

/**
 * Turns a bill's pay link into an in-app checkout when it is treasury's /pay page with an intent
 * (the subscription invoice link), otherwise into a link to open in a new tab (the public invoice
 * page /i/{token}, which runs its own checkout).
 */
export function payTargetFor(payUrl: string | undefined, fallbackAmount: number): PayTarget | null {
  if (!payUrl) return null
  let url: URL
  try {
    url = new URL(payUrl)
  } catch {
    return null
  }
  const intentId = url.searchParams.get('intent_id')
  const tenant = url.searchParams.get('tenant')
  if (url.pathname.replace(/\/+$/, '') === '/pay' && intentId && tenant) {
    const amount = Number(url.searchParams.get('amount'))
    return {
      mode: 'modal',
      intentId,
      tenant,
      amount: Number.isFinite(amount) && amount > 0 ? amount : fallbackAmount,
      currency: url.searchParams.get('currency') || 'KES',
      referenceId: url.searchParams.get('reference_id') ?? undefined,
      referenceType: url.searchParams.get('reference_type') ?? undefined,
    }
  }
  return { mode: 'link', href: payUrl }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
