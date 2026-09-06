import { apiClient } from './client'

// Platform-admin single-feature grants -- see subscriptions-api's TenantFeatureGrant schema doc.
// Distinct from CustomAddon (billing-only line items) and ProductSubscription/AssignProductPlan
// (grants a whole additional PLAN): a feature grant unlocks exactly one feature_definitions
// code for a tenant, independent of their subscription plan. The tenant's own service settings
// page still gates the actual on/off switch behind FeatureEnabled(code).

export interface TenantFeatureGrant {
  id: string
  tenant_id: string
  feature_code: string
  granted_by: string
  granted_at: string
  revoked_at?: string | null
  revoked_by?: string | null
  notes?: string
  created_at: string
  updated_at: string
}

export const getTenantFeatureGrants = (tenantId: string) =>
  apiClient.get<{ grants: TenantFeatureGrant[] }>(`/api/v1/admin/tenants/${tenantId}/feature-grants`)

export const grantTenantFeature = (tenantId: string, featureCode: string, notes?: string) =>
  apiClient.post<{ status: string }>(`/api/v1/admin/tenants/${tenantId}/feature-grants`, {
    featureCode,
    notes,
  })

export const revokeTenantFeature = (tenantId: string, featureCode: string) =>
  apiClient.delete<{ status: string }>(
    `/api/v1/admin/tenants/${tenantId}/feature-grants/${featureCode}`,
  )
