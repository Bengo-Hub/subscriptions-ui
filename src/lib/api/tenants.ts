import { apiClient } from './client'
import type { AdminSubscription } from '@/types/subscription'

export interface AdminTenant {
  id: string
  slug: string
  name: string
  email?: string
  createdAt: string
  subscriptionStatus?: string
  planCode?: string
}

export const listAdminTenants = () =>
  apiClient.get<{ data: AdminTenant[]; total: number }>('/api/v1/admin/tenants')

export const listAdminSubscriptions = () =>
  apiClient.get<{ data: AdminSubscription[]; total: number }>('/api/v1/admin/subscriptions')

export const assignPlan = (
  tenantId: string,
  data: { planCode: string; billingCycle?: string; activateTrial?: boolean },
) =>
  apiClient.post<{ status: string }>(`/api/v1/admin/tenants/${tenantId}/subscription`, data)

export const updateSubscriptionStatus = (
  subscriptionId: string,
  status: string,
) =>
  apiClient.put<{ status: string }>(`/api/v1/admin/subscriptions/${subscriptionId}/status`, { status })
