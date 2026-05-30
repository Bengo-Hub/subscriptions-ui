'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, getSubscription, updateSettings } from '@/lib/api/subscriptions'
import type { SubscriptionSettings } from '@/types/subscription'
import { useTenantFilterStore } from '@/store/tenant-filter'

export function useSubscription() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['subscription', tenantKey],
    queryFn: getSubscription,
    staleTime: 60_000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useSubscriptionSettings() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['subscription-settings', tenantKey],
    queryFn: getSettings,
    staleTime: 60_000,
  })
}

export function useUpdateSubscriptionSettings() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: (settings: Partial<SubscriptionSettings>) => updateSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-settings', tenantKey] })
      qc.invalidateQueries({ queryKey: ['subscription', tenantKey] })
      toast.success('Settings saved')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update settings'),
  })
}
