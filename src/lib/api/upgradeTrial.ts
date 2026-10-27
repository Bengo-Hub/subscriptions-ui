import { apiClient } from './client'
import type { Subscription } from '@/types/subscription'

// Upgrade trials and scheduled plan changes (subscriptions-api upgrade_trial.go handlers).
// A trial gives a higher tier of the current product for the configured days; the upgrade then
// takes effect on the next renewal date and that renewal is billed at the new plan's price.

export interface UpgradeTrialSetting {
  enabled: boolean | null
  days: number | null
  updated_at?: string
}

export interface UpgradeTrialPolicy {
  enabled: boolean
  days: number
  enabled_source?: 'tenant' | 'platform' | 'default' | ''
  days_source?: 'tenant' | 'platform' | 'default' | ''
  platform?: UpgradeTrialSetting
  tenant?: UpgradeTrialSetting
  max_days: number
}

export interface UpgradeTrialInfo {
  plan_code: string
  plan_name: string
  tier_order: number
  base_plan_code: string
  base_plan_name: string
  started_at: string
  ends_at: string
  days_remaining: number
  source: string
}

export interface ScheduledChangeInfo {
  plan_code: string
  plan_name: string
  from_plan_code: string
  from_plan_name: string
  effective_at: string
  source: 'tenant' | 'platform' | 'upgrade_trial' | 'checkout' | string
}

export interface UpgradeTrialEligibility {
  plan_code: string
  plan_name?: string
  eligible: boolean
  days: number
  ends_at?: string
  upgrade_at?: string
  reason?: string
  message?: string
}

export interface UpgradeTrialRecord {
  plan_code: string
  base_plan_code: string
  started_at: string
  ended_at: string
  outcome: string
}

export interface UpgradeTrialStatus {
  policy: UpgradeTrialPolicy
  active?: UpgradeTrialInfo
  scheduled_change?: ScheduledChangeInfo
  used: string[]
  history: UpgradeTrialRecord[]
  eligibility?: UpgradeTrialEligibility
}

// Tenant (acts on the signed-in tenant)
export const getUpgradeTrial = (planCode?: string) =>
  apiClient.get<UpgradeTrialStatus>('/api/v1/subscription/upgrade-trial', planCode ? { plan_code: planCode } : undefined)

export const startUpgradeTrial = (planCode: string) =>
  apiClient.post<Subscription>('/api/v1/subscription/upgrade-trial', { plan_code: planCode })

export const endUpgradeTrial = () => apiClient.delete<Subscription>('/api/v1/subscription/upgrade-trial')

export const cancelPlanChange = () => apiClient.delete<Subscription>('/api/v1/subscription/plan-change')

// Platform owner
export const getUpgradeTrialSettings = () => apiClient.get<UpgradeTrialPolicy>('/api/v1/admin/upgrade-trial/settings')

export const putUpgradeTrialSettings = (enabled: boolean, days: number) =>
  apiClient.put<UpgradeTrialPolicy>('/api/v1/admin/upgrade-trial/settings', { enabled, days })

export const getTenantUpgradeTrial = (tenantId: string, planCode?: string) =>
  apiClient.get<UpgradeTrialStatus>(`/api/v1/admin/tenants/${tenantId}/upgrade-trial`, planCode ? { plan_code: planCode } : undefined)

export const putTenantUpgradeTrialPolicy = (tenantId: string, setting: { enabled: boolean | null; days: number | null }) =>
  apiClient.put<UpgradeTrialPolicy>(`/api/v1/admin/tenants/${tenantId}/upgrade-trial/policy`, setting)

export const grantUpgradeTrial = (tenantId: string, planCode: string, days?: number) =>
  apiClient.post<Subscription>(`/api/v1/admin/tenants/${tenantId}/upgrade-trial`, { plan_code: planCode, days })

export const adminEndUpgradeTrial = (tenantId: string) =>
  apiClient.delete<Subscription>(`/api/v1/admin/tenants/${tenantId}/upgrade-trial`)

export const adminApplyPlanChange = (tenantId: string) =>
  apiClient.post<Subscription>(`/api/v1/admin/tenants/${tenantId}/plan-change/apply`, {})

export const adminCancelPlanChange = (tenantId: string) =>
  apiClient.delete<Subscription>(`/api/v1/admin/tenants/${tenantId}/plan-change`)
