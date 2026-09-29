import { apiClient } from './client'
import type { BillingInfo, InvoicePreview, CreditWallet } from '@/types/billing'

export const getBilling = () =>
  apiClient.get<BillingInfo>('/api/v1/billing')

export const getInvoicePreview = () =>
  apiClient.get<InvoicePreview>('/api/v1/billing/invoice-preview')

export const getCreditWallet = () =>
  apiClient.get<CreditWallet>('/api/v1/billing/credits')

export const setupPaymentMethod = (payload?: { billing_email?: string }) =>
  apiClient.post<{ initiate_url: string; payment_intent_id: string; status: string }>(
    '/api/v1/subscription/payment-method/setup',
    payload ?? {},
  )

export const setDefaultPaymentMethod = (last4: string) =>
  apiClient.put<{ status: string }>('/api/v1/subscription/payment-method/default', { last4 })

export const deletePaymentMethod = (last4: string) =>
  apiClient.delete<{ status: string }>('/api/v1/subscription/payment-method', { last4 })

export const cancelSubscription = () =>
  apiClient.post<{ status: string; cancel_at: string }>('/api/v1/subscription/cancel', {})

export const undoCancelSubscription = () =>
  apiClient.delete<{ status: string }>('/api/v1/subscription/cancel')

export const redeemCoupon = (code: string) =>
  apiClient.post<{ message: string; credits_earned: number; new_balance_kes: number }>(
    '/api/v1/subscription/coupon/redeem',
    { code },
  )

export const giftCredits = (tenantId: string, amountKes: number, reason: string) =>
  apiClient.post<{ status: string; amount_kes: number; new_balance_kes: number }>(
    `/api/v1/admin/tenants/${tenantId}/credits/gift`,
    { amount_kes: amountKes, reason },
  )

/** M-Pesa standing order (Ratiba) that pays the subscription every billing period. */
export interface StandingOrder {
  reference: string
  phone: string
  amount: string
  frequency: string
  start_date: string
  end_date: string
  status: 'pending_approval' | 'active' | string
}

export const getStandingOrder = () =>
  apiClient.get<{ standing_order: StandingOrder | null }>('/api/v1/subscription/standing-order')

export const registerStandingOrder = (phone: string) =>
  apiClient.post<StandingOrder>('/api/v1/subscription/standing-order', { phone })
