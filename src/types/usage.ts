export interface UsageMetric {
  name: string
  key: string
  used: number
  limit: number
  unit: string
  resetDate: string
}

export interface UsageAlert {
  metric: string
  current: number
  limit: number
  pct: number
}

export interface AdminUsageMetric {
  metricType: string
  period: string
  used: number
  limit: number
  periodStart: string
  periodEnd: string
}

export interface UsageOverrideRequest {
  metricType: string
  value: number
  periodStart?: string
  periodEnd?: string
  reason: string
}
