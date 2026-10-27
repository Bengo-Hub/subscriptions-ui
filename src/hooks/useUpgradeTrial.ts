'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminApplyPlanChange,
  adminCancelPlanChange,
  adminEndUpgradeTrial,
  cancelPlanChange,
  endUpgradeTrial,
  getTenantUpgradeTrial,
  getUpgradeTrial,
  getUpgradeTrialSettings,
  grantUpgradeTrial,
  putTenantUpgradeTrialPolicy,
  putUpgradeTrialSettings,
  startUpgradeTrial,
} from '@/lib/api/upgradeTrial'
import { changePlan } from '@/lib/api/subscriptions'
import { useTenantFilterStore } from '@/store/tenant-filter'

const errMsg = (e: any) => e?.response?.data?.error ?? e?.message ?? 'Something went wrong'

// Every view that shows the plan in force or the next bill.
function useRefreshSubscription() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['subscription', 'billing', 'invoice-preview', 'upgrade-trial']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

export function useUpgradeTrial(planCode?: string | null) {
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null)
  return useQuery({
    queryKey: ['upgrade-trial', tenantKey, planCode ?? null],
    queryFn: () => getUpgradeTrial(planCode ?? undefined),
    staleTime: 30_000,
  })
}

export function useStartUpgradeTrial() {
  const refresh = useRefreshSubscription()
  return useMutation({
    mutationFn: (planCode: string) => startUpgradeTrial(planCode),
    onSuccess: (sub: any) => {
      refresh()
      toast.success(`Your ${sub?.upgrade_trial?.plan_name ?? 'free'} trial has started`)
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useEndUpgradeTrial() {
  const refresh = useRefreshSubscription()
  return useMutation({
    mutationFn: () => endUpgradeTrial(),
    onSuccess: () => {
      refresh()
      toast.success('Trial ended. You stay on your current plan.')
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useCancelPlanChange() {
  const refresh = useRefreshSubscription()
  return useMutation({
    mutationFn: () => cancelPlanChange(),
    onSuccess: () => {
      refresh()
      toast.success('Plan change cancelled')
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

// A tenant's own upgrade is scheduled for the next renewal date (subscriptions-api ChangePlan).
export function useScheduleUpgrade() {
  const refresh = useRefreshSubscription()
  return useMutation({
    mutationFn: (planCode: string) => changePlan(planCode),
    onSuccess: () => {
      refresh()
      toast.success('Upgrade scheduled for your next renewal')
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

// Platform owner

export function useUpgradeTrialSettings() {
  return useQuery({ queryKey: ['admin-upgrade-trial-settings'], queryFn: getUpgradeTrialSettings, staleTime: 30_000 })
}

export function useSaveUpgradeTrialSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enabled, days }: { enabled: boolean; days: number }) => putUpgradeTrialSettings(enabled, days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-upgrade-trial-settings'] })
      qc.invalidateQueries({ queryKey: ['admin-tenant-upgrade-trial'] })
      qc.invalidateQueries({ queryKey: ['admin-configs'] })
      toast.success('Upgrade trial settings saved')
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useTenantUpgradeTrial(tenantId: string, planCode?: string) {
  return useQuery({
    queryKey: ['admin-tenant-upgrade-trial', tenantId, planCode ?? null],
    queryFn: () => getTenantUpgradeTrial(tenantId, planCode),
    enabled: !!tenantId,
    staleTime: 15_000,
  })
}

function useAdminTenantMutation<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-upgrade-trial'] })
      qc.invalidateQueries({ queryKey: ['admin-tenant-detail'] })
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      toast.success(success)
    },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useSaveTenantUpgradeTrialPolicy() {
  return useAdminTenantMutation(
    ({ tenantId, enabled, days }: { tenantId: string; enabled: boolean | null; days: number | null }) =>
      putTenantUpgradeTrialPolicy(tenantId, { enabled, days }),
    'Tenant trial setting saved',
  )
}

export function useGrantUpgradeTrial() {
  return useAdminTenantMutation(
    ({ tenantId, planCode, days }: { tenantId: string; planCode: string; days?: number }) => grantUpgradeTrial(tenantId, planCode, days),
    'Trial granted',
  )
}

export function useAdminEndUpgradeTrial() {
  return useAdminTenantMutation((tenantId: string) => adminEndUpgradeTrial(tenantId), 'Trial ended')
}

export function useAdminApplyPlanChange() {
  return useAdminTenantMutation((tenantId: string) => adminApplyPlanChange(tenantId), 'Plan change applied now')
}

export function useAdminCancelPlanChange() {
  return useAdminTenantMutation((tenantId: string) => adminCancelPlanChange(tenantId), 'Plan change cancelled')
}
