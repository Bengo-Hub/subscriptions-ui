'use client'

import { useQuery } from '@tanstack/react-query'
import { getUsageAlerts, getUsageSummary } from '@/lib/api/usage'
import { useTenantFilterStore } from '@/store/tenant-filter'

/** This billing period's usage per metric, with plan limits. */
export function useUsage() {
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null)
  return useQuery({
    queryKey: ['usage-summary', tenantKey],
    queryFn: getUsageSummary,
    staleTime: 60_000,
  })
}

export function useUsageAlerts() {
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null)
  return useQuery({
    queryKey: ['usage-alerts', tenantKey],
    queryFn: getUsageAlerts,
    staleTime: 60_000,
    select: (r) => r?.alerts ?? [],
  })
}
