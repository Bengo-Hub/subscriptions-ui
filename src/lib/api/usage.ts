import { apiClient } from './client'
import type { UsageAlert, AdminUsageMetric, UsageOverrideRequest } from '@/types/usage'

export const getUsageSummary = () =>
  apiClient.get<Record<string, unknown>>('/api/v1/usage')

export const getUsageDashboard = () =>
  apiClient.get<Record<string, unknown>>('/api/v1/usage/summary')

export const getUsageAlerts = () =>
  apiClient.get<UsageAlert[]>('/api/v1/usage/alerts')

export const getAdminTenantUsage = (tenantId: string) =>
  apiClient.get<{ tenant_id: string; period: string; metrics: AdminUsageMetric[] }>(
    `/api/v1/admin/usage/tenants/${tenantId}`,
  )

export const overrideMetric = (tenantId: string, req: UsageOverrideRequest) =>
  apiClient.put<{
    status: string
    metric_type: string
    old_value: number
    new_value: number
    period: string
  }>(`/api/v1/admin/usage/tenants/${tenantId}/override`, {
    metric_type: req.metricType,
    value: req.value,
    period_start: req.periodStart,
    period_end: req.periodEnd,
    reason: req.reason,
  })
