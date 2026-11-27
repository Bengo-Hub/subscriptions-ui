'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addPlanToSubscription, getSettings, getSubscription, removeAddOn, updateSettings } from '@/lib/api/subscriptions'
import { apiClient } from '@/lib/api/client'
import { refreshEntitlements } from '@/lib/auth/token-refresh'
import type { CurrentSubscription } from '@/lib/plans/catalog'
import type { SubscriptionSettings } from '@/types/subscription'
import { useTenantFilterStore } from '@/store/tenant-filter'

/**
 * The API's own message for a known refusal (409 conflict, 400, 403), so a conflict such as "this
 * service is already on your plan" never turns into a generic failure toast.
 */
export function apiErrorMessage(e: any, fallback: string): string {
  const msg = e?.response?.data?.error ?? e?.response?.data?.message
  if (typeof msg === 'string' && msg.trim()) return msg
  if (e?.response?.status === 409) return 'This is already on your plan.'
  return fallback
}

/**
 * GET /subscription in its raw snake_case shape (plan_code, add_ons, ...), as the plans and
 * billing pages read it. Null when the tenant has no subscription yet.
 */
export function useCurrentSubscription() {
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null)
  return useQuery({
    queryKey: ['current-subscription', tenantKey],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  })
}

/** Every view that shows the plan, its add-ons or the next bill, plus the token's service tags. */
function useRefreshPlanViews() {
  const qc = useQueryClient()
  return async () => {
    for (const key of ['current-subscription', 'subscription', 'billing', 'invoice-preview', 'upgrade-trial']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
    await refreshEntitlements()
  }
}

/** Adds another service's plan to the main plan. The caller handles any payment in the answer. */
export function useAddPlanToSubscription() {
  const refresh = useRefreshPlanViews()
  return useMutation({
    mutationFn: ({ planCode, termsVersion }: { planCode: string; termsVersion: string }) =>
      addPlanToSubscription(planCode, { version: termsVersion }),
    onSuccess: () => refresh(),
    onError: (e: any) => {
      // A conflict ("already covered by your plan", already attached) is an answer, shown as
      // information with the API's words, and the page refreshes to show what is there.
      if (e?.response?.status === 409) {
        void refresh()
        toast.message(apiErrorMessage(e, 'This is already on your plan.'))
        return
      }
      toast.error(apiErrorMessage(e, 'Could not add this plan. Please try again.'))
    },
  })
}

export function useRemoveAddOn() {
  const refresh = useRefreshPlanViews()
  return useMutation({
    mutationFn: (productCode: string) => removeAddOn(productCode),
    onSuccess: () => {
      void refresh()
      toast.success('Done. The add-on stays on until your plan renews, then it is removed.')
    },
    onError: (e: any) => {
      if (e?.response?.status === 409) {
        void refresh()
        toast.message(apiErrorMessage(e, 'This add-on is already being removed.'))
        return
      }
      toast.error(apiErrorMessage(e, 'Could not remove the add-on. Please try again.'))
    },
  })
}

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
