'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  cancelAdminAddon,
  createAdminAddon,
  getAdminTenantAddons,
  getMyAddons,
  listPlanAddons,
  purchasePlanAddon,
  removePlanAddon,
  updateAdminAddon,
} from '@/lib/api/addons'
import type { CustomAddonCreateRequest, CustomAddonUpdateRequest } from '@/types/addon'
import { useTenantFilterStore } from '@/store/tenant-filter'

// ── Self-service plan addons ──────────────────────────────────────────────────

export function usePlanAddons() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['plan-addons', tenantKey],
    queryFn: listPlanAddons,
    staleTime: 60_000,
  })
}

export function usePurchasePlanAddon() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: ({ featureCode, returnUrl }: { featureCode: string; returnUrl?: string }) =>
      purchasePlanAddon(featureCode, returnUrl),
    onSuccess: (res) => {
      if (res.status === 'activated') {
        toast.success(`Add-on activated`)
        qc.invalidateQueries({ queryKey: ['plan-addons', tenantKey] })
        qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to purchase add-on'),
  })
}

export function useRemovePlanAddon() {
  const qc = useQueryClient()
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useMutation({
    mutationFn: (featureCode: string) => removePlanAddon(featureCode),
    onSuccess: () => {
      toast.success('Add-on removed')
      qc.invalidateQueries({ queryKey: ['plan-addons', tenantKey] })
      qc.invalidateQueries({ queryKey: ['billing', tenantKey] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to remove add-on'),
  })
}

// ── Custom addons (admin-managed) ─────────────────────────────────────────────

export function useMyAddons() {
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant)
  const tenantKey = selectedTenant?.id ?? null
  return useQuery({
    queryKey: ['my-addons', tenantKey],
    queryFn: getMyAddons,
    staleTime: 60_000,
  })
}

export function useAdminTenantAddons(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-addons', tenantId],
    queryFn: () => getAdminTenantAddons(tenantId),
    enabled: !!tenantId,
    staleTime: 60_000,
  })
}

export function useCreateAdminAddon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, req }: { tenantId: string; req: CustomAddonCreateRequest }) =>
      createAdminAddon(tenantId, req),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-addons', tenantId] })
      toast.success('Addon added')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useUpdateAdminAddon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tenantId,
      addonId,
      req,
    }: {
      tenantId: string
      addonId: string
      req: CustomAddonUpdateRequest
    }) => updateAdminAddon(tenantId, addonId, req),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-addons', tenantId] })
      toast.success('Addon updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useCancelAdminAddon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, addonId }: { tenantId: string; addonId: string }) =>
      cancelAdminAddon(tenantId, addonId),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-addons', tenantId] })
      toast.success('Addon cancelled')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
