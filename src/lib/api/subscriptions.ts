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

export const initiateSubscription = (data: { planCode: string; billingCycle?: string }) =>
  apiClient.post<{ initiate_url: string; payment_intent_id: string }>(
    '/api/v1/subscription/initiate',
    data,
  )

export const changePlan = (data: { planCode: string; billingCycle?: string }) =>
  apiClient.put<Subscription>('/api/v1/subscription/plan', data)

export const extendTrial = (tenantId: string, trialEndsAt: string) =>
  apiClient.post<{ status: string; trial_ends_at: string }>(
    `/api/v1/admin/tenants/${tenantId}/subscription/extend-trial`,
    { trial_ends_at: trialEndsAt },
  )

export const listExpiring = (days?: number) =>
  apiClient.get<Subscription[]>('/api/v1/subscriptions/expiring', days ? { days } : undefined)
