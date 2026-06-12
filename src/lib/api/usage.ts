import { apiClient } from './client'
import type { UsageAlert, AdminUsageMetric, UsageOverrideRequest } from '@/types/usage'

export const getUsageSummary = () =>
  apiClient.get<Record<string, unknown>>('/api/v1/usage')

export const getUsageDashboard = () =>
  apiClient.get<Record<string, unknown>>('/api/v1/usage/summary')

export const getUsageAlerts = () =>
  apiClient.get<UsageAlert[]>('/api/v1/usage/alerts')

// Raw shape returned by the API (snake_case). The handler emits metric_type / period_start /
// period_end, which don't match the camelCase AdminUsageMetric the UI consumes — so we map them
// here. Without this, m.metricType is undefined and the "Metric" column renders blank AND the
// Override action posts metric_type: undefined (which the backend rejects).
interface RawAdminUsageMetric {
  metric_type: string
  period: string
  used: number
  limit: number
  period_start?: string
  period_end?: string
}

// "sms_sent" -> "Sms Sent", "tables" -> "Tables". A friendly label for display; the raw
// metricType is kept for the override payload + key.
const prettyMetric = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const getAdminTenantUsage = async (
  tenantId: string,
): Promise<{ tenant_id: string; period: string; metrics: AdminUsageMetric[] }> => {
  const res = await apiClient.get<{ tenant_id: string; period: string; metrics: RawAdminUsageMetric[] }>(
    `/api/v1/admin/usage/tenants/${tenantId}`,
  )
  return {
    tenant_id: res?.tenant_id ?? tenantId,
    period: res?.period ?? '',
    metrics: (res?.metrics ?? []).map((m) => ({
      metricType: m.metric_type,
      label: prettyMetric(m.metric_type ?? ''),
      period: m.period,
      used: m.used,
      limit: m.limit,
      periodStart: m.period_start ?? '',
      periodEnd: m.period_end ?? '',
    })),
  }
}

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
