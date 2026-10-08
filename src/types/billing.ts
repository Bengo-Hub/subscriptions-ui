// Shapes returned by subscriptions-api's billing endpoints. GET /billing is camelCase; the invoice
// preview and credit wallet endpoints are snake_case, so their types are too (they were declared
// camelCase before, which made every field read as undefined).

import type { TenantSupportAgreement, TenantSupportCharge } from '@/components/billing/SupportChargesCard'

export type PaymentMethod =
  | {
      type: 'card'
      brand: string
      last4: string
      expiryMonth: string
      expiryYear: string
      isDefault?: boolean
    }
  | {
      type: 'mobile_money'
      phone: string
      provider: string
      last4?: string
      isDefault?: boolean
    }

export type InvoiceStatus = 'paid' | 'pending' | 'partial' | 'failed' | 'void' | 'overdue' | string

export interface Invoice {
  id: string
  date: string
  amount: number
  amountPaid?: number
  currency: string
  status: InvoiceStatus
  description: string
  pdfUrl?: string
  /** Present while something is still owed: treasury's pay page for this invoice. */
  payUrl?: string
  /** What the invoice bills: the plan, or a support agreement (paid through its support charge). */
  kind?: 'subscription' | 'support'
}

export interface OverageLine {
  metric_type: string
  units_used: number
  plan_limit: number
  units_over: number
  unit_price_kes: number
  total_kes: number
}

export interface AddonLine {
  name: string
  service_code?: string
  billing_cycle: string
  unit_price_kes: number
  quantity: number
  total_kes: number
}

export interface InvoicePreview {
  base_plan_price_kes: number
  currency: string
  overage_charges: OverageLine[]
  overage_total_kes: number
  custom_addons: AddonLine[]
  addons_total_kes: number
  credits_available_kes: number
  credits_to_apply_kes: number
  estimated_total_kes: number
}

export interface CreditTransaction {
  id: string
  type: string
  amount_kes: number
  description: string
  created_at: string
}

export interface CreditWallet {
  balance_kes: number
  transactions: CreditTransaction[]
}

export interface BillingInfo {
  hasSubscription: boolean
  subscriptionId?: string
  status?: string
  billingCycle?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  /** Null for perpetual licences. */
  nextRenewalDate?: string | null
  planCode?: string
  planName?: string
  planType?: string
  amount?: number
  nextAmount?: number
  currency?: string
  billingMode?: 'recurring' | 'one_time' | 'service_charge'
  isPerpetual?: boolean
  /** Primary payment method (first in list / default). */
  paymentMethod?: PaymentMethod
  /** All saved payment methods. Index 0 is the default. */
  paymentMethods?: PaymentMethod[]
  /** True when subscription is queued to cancel at period end. */
  cancelAtPeriodEnd?: boolean
  invoices: Invoice[]
  supportAgreements?: TenantSupportAgreement[]
  supportCharges?: TenantSupportCharge[]
  supportBlocked?: boolean
}
