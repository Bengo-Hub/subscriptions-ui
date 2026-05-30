'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAdminTenantUsage, overrideMetric } from '@/lib/api/usage'
import type { UsageOverrideRequest } from '@/types/usage'

export function useAdminTenantUsage(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-usage', tenantId],
    queryFn: () => getAdminTenantUsage(tenantId),
    enabled: !!tenantId,
    staleTime: 30_000,
  })
}

export function useOverrideMetric() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, req }: { tenantId: string; req: UsageOverrideRequest }) =>
      overrideMetric(tenantId, req),
    onSuccess: (_, { tenantId }) => {
      toast.success('Usage metric overridden')
      qc.invalidateQueries({ queryKey: ['admin-tenant-usage', tenantId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to override metric'),
  })
}
