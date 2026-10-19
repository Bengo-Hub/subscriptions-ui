import { apiClient } from './client'

export type CreditServiceCode = 'sms' | 'whatsapp'

export interface CreditBundle {
  code: string
  units: number
  price_kes: number
}

export interface CreditTier {
  code: string
  name: string
  price_kes: number
  /** -1 means unlimited. */
  monthly_units: number
}

export interface CreditSnapshot {
  service: string
  label: string
  exempt: boolean
  covered: boolean
  reason?: string
  bundle_balance: number
  quota_balance: number
  unlimited: boolean
  tier_code?: string
  tier_period_end?: string
  auto_renew: boolean
  overage_pending_kes: number
  overage_cap_kes: number
  unit_price_kes: number
  bundles: CreditBundle[]
  tiers: CreditTier[] | null
}

export interface CreditPurchaseIntent {
  intent_id: string
  status: string
  amount: string
  currency: string
  initiate_url?: string
  authorization_url?: string
}

/** One add-on chosen with a plan at checkout. Prices are resolved by the server. */
export interface CheckoutAddon {
  service: CreditServiceCode
  kind: 'bundle' | 'tier'
  code: string
}

export const listCredits = () => apiClient.get<{ services: CreditSnapshot[] }>('/api/v1/credits')

export const purchaseCredits = (service: CreditServiceCode, body: { kind: 'bundle' | 'tier'; code: string; return_url?: string }) =>
  apiClient.post<CreditPurchaseIntent>(`/api/v1/credits/${service}/purchase`, body)

export const setCreditAutoRenew = (service: CreditServiceCode, autoRenew: boolean) =>
  apiClient.post<{ auto_renew: boolean }>(`/api/v1/credits/${service}/auto-renew`, { auto_renew: autoRenew })

/** Platform owner only: add units to a tenant without a payment. */
export const adminGrantCredits = (tenantId: string, service: CreditServiceCode, body: { units: number; reason: string; key?: string }) =>
  apiClient.post<{ balance: number; applied: boolean }>(`/api/v1/admin/tenants/${tenantId}/credits/${service}/grant`, body)
