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
    mutationFn: setupPaymentMethod,
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to set up payment method'),
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
