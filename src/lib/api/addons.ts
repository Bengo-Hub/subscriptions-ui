import { apiClient } from './client'
import type { CustomAddon, CustomAddonCreateRequest, CustomAddonUpdateRequest } from '@/types/addon'

// ── Self-service plan addons (PlanFeature with is_included=false) ─────────────

export interface PlanAddon {
  feature_code: string
  plan_id: string
  limit_value?: number
  overage_unit_price: number
  purchased: boolean
}

export const listPlanAddons = () =>
  apiClient.get<{ addons: PlanAddon[] }>('/api/v1/addons')

export const purchasePlanAddon = (featureCode: string, returnUrl?: string) =>
  apiClient.post<{ status: string; feature_code: string; intent?: Record<string, any> }>(
    `/api/v1/addons/${featureCode}/purchase`,
    returnUrl ? { return_url: returnUrl } : {},
  )

export const removePlanAddon = (featureCode: string) =>
  apiClient.delete<{ status: string; feature_code: string }>(
    `/api/v1/addons/${featureCode}`,
  )

// ── Custom addons (admin-managed recurring line items) ────────────────────────

export const getMyAddons = () =>
  apiClient.get<{ data: CustomAddon[] }>('/api/v1/custom-addons')

export const getAdminTenantAddons = (tenantId: string) =>
  apiClient.get<{ data: CustomAddon[] }>(`/api/v1/admin/tenants/${tenantId}/custom-addons`)

export const createAdminAddon = (tenantId: string, req: CustomAddonCreateRequest) =>
  apiClient.post<CustomAddon>(
    `/api/v1/admin/tenants/${tenantId}/custom-addons`,
    {
      name: req.name,
      description: req.description,
      service_code: req.serviceCode,
      service_addon_type: req.serviceAddonType,
      billing_cycle: req.billingCycle,
      unit_price_kes: req.unitPriceKes,
      quantity: req.quantity ?? 1,
      notes: req.notes,
    },
  )

export const updateAdminAddon = (tenantId: string, addonId: string, req: CustomAddonUpdateRequest) =>
  apiClient.patch<CustomAddon>(
    `/api/v1/admin/tenants/${tenantId}/custom-addons/${addonId}`,
    {
      name: req.name,
      description: req.description,
      billing_cycle: req.billingCycle,
      unit_price_kes: req.unitPriceKes,
      quantity: req.quantity,
      status: req.status,
      notes: req.notes,
    },
  )

// Soft state change: cancel / reactivate / pause via PATCH status.
export const setAdminAddonStatus = (tenantId: string, addonId: string, status: 'active' | 'paused' | 'cancelled') =>
  apiClient.patch<CustomAddon>(
    `/api/v1/admin/tenants/${tenantId}/custom-addons/${addonId}`,
    { status },
  )

// Permanently removes the add-on (hard delete).
export const deleteAdminAddon = (tenantId: string, addonId: string) =>
  apiClient.delete<{ status: string }>(
    `/api/v1/admin/tenants/${tenantId}/custom-addons/${addonId}`,
  )
