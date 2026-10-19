'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminGrantCredits, listCredits, setCreditAutoRenew, type CreditServiceCode } from '@/lib/api/credits'
import { useTenantFilterStore } from '@/store/tenant-filter'

/** SMS and WhatsApp state (balances, plans, bundles on offer) for the acting tenant. */
export function useCredits(enabled = true) {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['credits', tenantKey],
    queryFn: async () => (await listCredits()).services,
    staleTime: 30_000,
    enabled,
  })
}

export function useSetCreditAutoRenew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ service, on }: { service: CreditServiceCode; on: boolean }) => setCreditAutoRenew(service, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
    onError: () => toast.error('Could not change renewal. Try again.'),
  })
}

export function useAdminGrantCredits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { tenantId: string; service: CreditServiceCode; units: number; reason: string }) =>
      adminGrantCredits(v.tenantId, v.service, { units: v.units, reason: v.reason, key: `admin:${crypto.randomUUID()}` }),
    onSuccess: () => {
      toast.success('Units added')
      qc.invalidateQueries({ queryKey: ['credits'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Could not add units'),
  })
}
