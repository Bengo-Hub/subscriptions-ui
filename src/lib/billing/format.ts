import { formatCurrency } from '@bengo-hub/shared-ui-lib'

/** "5 Oct 2026", or a dash when there is no date. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full KES figure (never rounded to k/M, so parts and totals always add up). */
export function fmtMoney(amount?: number | null, currency = 'KES'): string {
  return amount == null ? '—' : formatCurrency(amount, currency)
}

export function titleCase(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
