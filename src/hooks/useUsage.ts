'use client'

import { useQuery } from '@tanstack/react-query'
import { getUsageAlerts, getUsageDashboard, getUsageSummary } from '@/lib/api/usage'
import { useTenantFilterStore } from '@/store/tenant-filter'

export function useUsage() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['usage-summary', tenantKey],
    queryFn: getUsageSummary,
    staleTime: 60_000,
  })
}

export function useUsageDashboard() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['usage-dashboard', tenantKey],
    queryFn: getUsageDashboard,
    staleTime: 60_000,
  })
}

export function useUsageAlerts() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['usage-alerts', tenantKey],
    queryFn: getUsageAlerts,
    staleTime: 60_000,
  })
}
