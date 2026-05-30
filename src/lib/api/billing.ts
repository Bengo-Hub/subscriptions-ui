import { apiClient } from './client'
import type { BillingInfo, InvoicePreview, CreditWallet } from '@/types/billing'

export const getBilling = () =>
  apiClient.get<BillingInfo>('/api/v1/billing')

export const getInvoicePreview = () =>
  apiClient.get<InvoicePreview>('/api/v1/billing/invoice-preview')

export const getCreditWallet = () =>
  apiClient.get<CreditWallet>('/api/v1/billing/credits')

export const setupPaymentMethod = () =>
  apiClient.post<{ initiate_url: string; payment_intent_id: string; status: string }>(
    '/api/v1/subscription/payment-method/setup',
    {},
  )

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
