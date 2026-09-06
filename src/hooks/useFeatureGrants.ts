'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTenantFeatureGrants,
  grantTenantFeature,
  revokeTenantFeature,
} from '@/lib/api/feature-grants'

// Add-on features a platform admin can grant a tenant independent of its subscription plan.
// Kept as a small hardcoded list (matches subscriptions-api's cmd/seed/feature_catalog.go add-on
// entries) rather than a generic "pick any catalog code" picker -- there are only a handful of
// these by design, and a generic picker would let an admin accidentally grant an ordinary
// plan-bundled feature through the wrong door.
export const ADDON_FEATURES: { code: string; label: string; description: string }[] = [
  {
    code: 'multi_branch_pricing',
    label: 'Per-Branch/Outlet Pricing',
    description: 'Lets the tenant set a different base price for the same product per outlet.',
  },
  {
    code: 'batch_period_pricing',
    label: 'Stock-Age / Batch Markdown Pricing',
    description: 'Lets the tenant mark down old stock by receiving-batch age (clearance pricing).',
  },
  {
    code: 'flash_sale',
    label: 'Flash-Sale Timed Discounts',
    description: 'Lets the tenant run countdown-driven storefront flash sales on ordering-frontend.',
  },
]

export function useTenantFeatureGrants(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-feature-grants', tenantId],
    queryFn: () => getTenantFeatureGrants(tenantId),
    enabled: !!tenantId,
    staleTime: 60_000,
  })
}

export function useGrantTenantFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, featureCode, notes }: { tenantId: string; featureCode: string; notes?: string }) =>
      grantTenantFeature(tenantId, featureCode, notes),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['tenant-feature-grants', tenantId] })
      toast.success('Add-on feature granted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useRevokeTenantFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, featureCode }: { tenantId: string; featureCode: string }) =>
      revokeTenantFeature(tenantId, featureCode),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['tenant-feature-grants', tenantId] })
      toast.success('Add-on feature revoked')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
