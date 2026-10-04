import { apiClient } from './client'

// Support agreements: the recurring hosting and support fee of one-time license tenants
// (STANDARD) and tenant-specific special support (SPECIAL). See subscriptions-api
// internal/modules/subscriptions/support_agreements.go. An unpaid charge blocks
// create/edit/delete across every service once its due date plus 7 days has passed.

export type SupportKind = 'STANDARD' | 'SPECIAL'
export type SupportCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'CUSTOM'
export type SupportIntervalUnit = 'MONTH' | 'DAY'
export type SupportTiming = 'ADVANCE' | 'ARREARS'
export type SupportAgreementStatus = 'ACTIVE' | 'PAUSED' | 'ENDED'
export type SupportChargeStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE' | 'WAIVED'

export interface SupportCharge {
  id: string
  tenant_id: string
  tenant_name?: string
  agreement_id?: string
  agreement_name?: string
  agreement_kind?: SupportKind
  cycle_number: number
  period_start: string
  period_end?: string
  due_date: string
  status: SupportChargeStatus
  paid_at?: string
  grace_until?: string
  base_price: number
  custom_price?: number
  custom_price_reason?: string
  effective_price: number
  invoice_number?: string
  invoice_total?: number
  pay_url?: string
  pdf_url?: string
  blocking: boolean
}

export type SupportCollection = 'business' | 'personal'

export interface SupportAgreement {
  id: string
  tenant_id: string
  kind: SupportKind
  name: string
  support_plan_code?: string
  billing_cycle: SupportCycle
  interval_count: number
  interval_unit: SupportIntervalUnit
  amount?: number
  period_amount: number
  monthly_equivalent: number
  annual_list_price?: number
  currency: string
  billing_timing: SupportTiming
  starts_at: string
  ends_at?: string
  status: SupportAgreementStatus
  next_period_start: string
  cycle_count: number
  notes?: string
  billing_email?: string
  /** personal: the platform owner's own engagement, invoiced off the company books into the personal PayHero channel. */
  collection?: SupportCollection
  cycles: SupportCharge[]
}

export interface SupportTotals {
  open_count: number
  open_amount: number
  overdue_count: number
  overdue_amount: number
  blocking_count: number
  blocking_amount: number
}

/** Create or partial update. Omitted fields are left unchanged on update. */
export interface SupportAgreementInput {
  kind?: SupportKind
  name?: string
  billing_cycle?: SupportCycle
  interval_count?: number
  interval_unit?: SupportIntervalUnit
  amount?: number
  clear_amount?: boolean
  currency?: string
  billing_timing?: SupportTiming
  starts_at?: string
  ends_at?: string
  clear_ends_at?: boolean
  status?: SupportAgreementStatus
  notes?: string
  billing_email?: string
  /** personal: the platform owner's own engagement, invoiced off the company books into the personal PayHero channel. */
  collection?: SupportCollection
  reschedule_from?: 'next_period' | 'now'
}

export interface SupportChargeFilters {
  page?: number
  limit?: number
  status?: string
  tenant_id?: string
  agreement_id?: string
  kind?: SupportKind
  blocking?: boolean
  search?: string
}

export const getTenantSupportAgreements = (tenantId: string) =>
  apiClient.get<{ agreements: SupportAgreement[]; outstanding: SupportTotals }>(
    `/api/v1/admin/tenants/${tenantId}/support-agreements`,
  )

export const createSupportAgreement = (tenantId: string, input: SupportAgreementInput) =>
  apiClient.post<SupportAgreement>(`/api/v1/admin/tenants/${tenantId}/support-agreements`, input)

export const updateSupportAgreement = (id: string, input: SupportAgreementInput) =>
  apiClient.put<SupportAgreement>(`/api/v1/admin/support-agreements/${id}`, input)

export const listSupportCharges = (filters: SupportChargeFilters) =>
  apiClient.get<{
    data: SupportCharge[]
    total: number
    page: number
    limit: number
    hasMore: boolean
    outstanding: SupportTotals
  }>('/api/v1/admin/support-fee-cycles', {
    ...filters,
    blocking: filters.blocking ? 'true' : undefined,
    search: filters.search || undefined,
  })

export const updateSupportCharge = (
  id: string,
  body: {
    custom_price?: number
    custom_price_reason?: string
    clear_custom_price?: boolean
    status?: 'PAID' | 'WAIVED'
    reason?: string
  },
) => apiClient.put<SupportCharge>(`/api/v1/admin/support-fee-cycles/${id}`, body)

export const issueSupportChargeInvoice = (id: string, force = false) =>
  apiClient.post<SupportCharge>(`/api/v1/admin/support-fee-cycles/${id}/invoice${force ? '?force=true' : ''}`)

export const SUPPORT_CYCLE_LABELS: Record<SupportCycle, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Every 6 months',
  ANNUAL: 'Yearly',
  CUSTOM: 'Custom',
}

/** Human label for an agreement's billing period, e.g. "Every 2 months", "Every 14 days". */
export function supportPeriodLabel(a: Pick<SupportAgreement, 'billing_cycle' | 'interval_count' | 'interval_unit'>) {
  if (a.billing_cycle !== 'CUSTOM') return SUPPORT_CYCLE_LABELS[a.billing_cycle]
  const unit = a.interval_unit === 'DAY' ? 'day' : 'month'
  return a.interval_count === 1 ? `Every ${unit}` : `Every ${a.interval_count} ${unit}s`
}
