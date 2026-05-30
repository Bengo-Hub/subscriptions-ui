'use client'

import { useQuery } from '@tanstack/react-query'
import { getUsageAlerts, getUsageDashboard, getUsageSummary } from '@/lib/api/usage'

export function useUsage() {
  return useQuery({
    queryKey: ['usage-summary'],
    queryFn: getUsageSummary,
    staleTime: 60_000,
  })
}

export function useUsageDashboard() {
  return useQuery({
    queryKey: ['usage-dashboard'],
    queryFn: getUsageDashboard,
    staleTime: 60_000,
  })
}

export function useUsageAlerts() {
  return useQuery({
    queryKey: ['usage-alerts'],
    queryFn: getUsageAlerts,
    staleTime: 60_000,
  })
}
