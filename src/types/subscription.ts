export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME'
export type BillingMode = 'recurring' | 'one_time' | 'service_charge'
export type PlanType = 'TIERED' | 'STANDALONE_SERVICE' | 'BUNDLE' | 'CUSTOM'

export interface Subscription {
  id: string
  tenantId: string
  planCode: string
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  // Billing scenario resolved by subscriptions-api (snake_case on the raw response):
  // billing_mode/plan_type/is_perpetual. is_perpetual=true → one-time licence that never renews.
  billing_mode?: BillingMode
  plan_type?: PlanType
  is_perpetual?: boolean
  trialEndsAt?: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  cancelReason?: string
  features: string[]
  limits: Record<string, number>
  metadata: Record<string, unknown>
  appliedDiscount?: number
  // active_products is the product_code of every currently-active ProductSubscription (see
  // subscriptions-api's ActiveProductCodes). exempt marks platform/demo/service-charge/explicitly
  // -exempt tenants, who bypass all gating. Both snake_case on the raw response (this type mixes
  // cases to match the actual backend field names — see billing_mode/plan_type above).
  active_products?: string[]
  exempt?: boolean
}

export interface SubscriptionSettings {
  autoRenew: boolean
  billingEmail: string
  notifyBeforeRenewal: boolean
  notifyOnUsageThreshold: boolean
  usageThresholdPercent: number
}

export interface AdminSubscription {
  id: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  planName: string
  planCode: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodEnd: string
  mrr: number
  dunningAttempt: number
  hasPaymentMethod: boolean
}
