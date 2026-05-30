import { apiClient } from './client'
import type { CustomAddon, CustomAddonCreateRequest, CustomAddonUpdateRequest } from '@/types/addon'

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

export const cancelAdminAddon = (tenantId: string, addonId: string) =>
  apiClient.delete<{ status: string }>(
    `/api/v1/admin/tenants/${tenantId}/custom-addons/${addonId}`,
  )
