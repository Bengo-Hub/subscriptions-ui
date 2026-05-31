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
  setDefaultPaymentMethod,
  deletePaymentMethod,
  cancelSubscription,
  undoCancelSubscription,
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
