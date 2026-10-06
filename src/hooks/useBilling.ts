'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getBilling,
  getCreditWallet,
  getInvoicePreview,
  giftCredits,
  redeemCoupon,
  setupPaymentMethod,
  confirmPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  cancelSubscription,
  undoCancelSubscription,
  getStandingOrder,
  getStandingOrderQuote,
  registerStandingOrder,
  cancelStandingOrder,
} from '@/lib/api/billing'
import { useTenantFilterStore } from '@/store/tenant-filter'

export function useBilling() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['billing', tenantKey],
    queryFn: getBilling,
    staleTime: 60_000,
  })
}

export function useInvoicePreview() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['invoice-preview', tenantKey],
    queryFn: getInvoicePreview,
    staleTime: 5 * 60_000,
  })
}

export function useCreditWallet() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['credit-wallet', tenantKey],
    queryFn: getCreditWallet,
    staleTime: 60_000,
  })
}

export function useSetupPaymentMethod() {
  return useMutation({
    mutationFn: (payload?: { billing_email?: string }) => setupPaymentMethod(payload),
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to set up payment method'),
  })
}

export function useConfirmPaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (intentId: string) => confirmPaymentMethod(intentId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  })
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: (last4: string) => setDefaultPaymentMethod(last4),
    onSuccess: () => {
      toast.success('Default payment method updated')
      qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update default payment method'),
  })
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: (last4: string) => deletePaymentMethod(last4),
    onSuccess: () => {
      toast.success('Payment method removed')
      qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to remove payment method'),
  })
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success('Subscription cancellation scheduled — access continues until your current period ends')
      qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to cancel subscription'),
  })
}

export function useUndoCancelSubscription() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: undoCancelSubscription,
    onSuccess: () => {
      toast.success('Subscription cancellation reversed — auto-renewal restored')
      qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to reverse cancellation'),
  })
}

export function useRedeemCoupon() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: (code: string) => redeemCoupon(code),
    onSuccess: (res) => {
      toast.success(`${res.message} — KES ${res.credits_earned.toLocaleString()} added to your credit wallet`)
      qc.invalidateQueries({ queryKey: ['credit-wallet', tenantKey] })
      qc.invalidateQueries({ queryKey: ['invoice-preview', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Invalid or expired coupon code'),
  })
}

export function useGiftCredits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, amountKes, reason }: { tenantId: string; amountKes: number; reason: string }) =>
      giftCredits(tenantId, amountKes, reason),
    onSuccess: (_, { tenantId }) => {
      toast.success('Credits gifted successfully')
      qc.invalidateQueries({ queryKey: ['admin-tenant-usage', tenantId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to gift credits'),
  })
}

export function useStandingOrder() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['standing-order', tenantKey],
    queryFn: getStandingOrder,
    staleTime: 60_000,
    select: (r) => r.standing_order,
  })
}

export function useStandingOrderQuote(enabled = true) {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['standing-order-quote', tenantKey],
    queryFn: getStandingOrderQuote,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useCancelStandingOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelStandingOrder,
    onSuccess: () => {
      toast.success('Standing order cancelled. Also end it in M-Pesa so no further debits are made.')
      qc.invalidateQueries({ queryKey: ['standing-order'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Could not cancel the standing order'),
  })
}

export function useRegisterStandingOrder() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: ({ phone, authorised }: { phone: string; authorised: boolean }) => registerStandingOrder(phone, authorised),
    onSuccess: () => {
      toast.success('Approve the standing order on your phone to finish setting it up')
      qc.invalidateQueries({ queryKey: ['standing-order', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Could not set up the M-Pesa standing order'),
  })
}
