export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME'

export interface Subscription {
  id: string
  tenantId: string
  planCode: string
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  trialEndsAt?: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  cancelReason?: string
  features: string[]
  limits: Record<string, number>
  metadata: Record<string, unknown>
  appliedDiscount?: number
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
