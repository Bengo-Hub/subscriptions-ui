import { apiClient } from './client'
import type { Subscription, SubscriptionSettings } from '@/types/subscription'

export const getSubscription = () =>
  apiClient.get<Subscription>('/api/v1/subscription')

export const getSubscriptionByTenantId = (tenantId: string) =>
  apiClient.get<Subscription>(`/api/v1/tenants/${tenantId}/subscription`)

export const getSettings = () =>
  apiClient.get<SubscriptionSettings>('/api/v1/subscription/settings')

export const updateSettings = (settings: Partial<SubscriptionSettings>) =>
  apiClient.put<{ status: string }>('/api/v1/subscription/settings', settings)

export const initiateSubscription = (planCode: string, returnUrl?: string) =>
  apiClient.post<{ intent_id: string; status: string; amount: string; currency: string; initiate_url?: string; authorization_url?: string }>(
    '/api/v1/subscription/initiate',
    { plan_code: planCode, return_url: returnUrl },
  )

// Current subscription Terms & Conditions (version + markdown text) shown in the subscribe flow.
export const getTerms = () =>
  apiClient.get<{ version: string; content: string }>('/api/v1/terms')

export const createSubscription = (
  planCode: string,
  opts?: { bundleCode?: string; termsVersion?: string; termsAccepted?: boolean },
) =>
  apiClient.post<Subscription>('/api/v1/subscription', {
    plan_code: planCode,
    bundle_code: opts?.bundleCode,
    // T&C acceptance is required server-side for tenant self-serve subscribes.
    terms_version: opts?.termsVersion,
    terms_accepted: opts?.termsAccepted,
  })

export const changePlan = (newPlanCode: string, billingCycle?: string) =>
  apiClient.put<Subscription>('/api/v1/subscription/plan', {
    new_plan_code: newPlanCode,
    billing_cycle: billingCycle,
  })

export const extendTrial = (tenantId: string, trialEndsAt: string) =>
  apiClient.post<{ status: string; trial_ends_at: string }>(
    `/api/v1/admin/tenants/${tenantId}/subscription/extend-trial`,
    { trial_ends_at: trialEndsAt },
  )

export const listExpiring = (days?: number) =>
  apiClient.get<Subscription[]>('/api/v1/subscriptions/expiring', days ? { days } : undefined)
