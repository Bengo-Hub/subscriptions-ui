export type AddonBillingCycle = 'monthly' | 'annual' | 'one_time'
export type AddonStatus = 'active' | 'paused' | 'cancelled'

export interface CustomAddon {
  id: string
  tenant_id: string
  name: string
  description?: string
  service_code?: string
  service_addon_type?: string
  billing_cycle: AddonBillingCycle
  unit_price_kes: number
  quantity: number
  status: AddonStatus
  notes?: string
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface CustomAddonCreateRequest {
  name: string
  description?: string
  serviceCode?: string
  serviceAddonType?: string
  billingCycle: AddonBillingCycle
  unitPriceKes: number
  quantity?: number
  notes?: string
  // Free-form notes for the platform team.
  metadata?: Record<string, unknown>
}

export interface CustomAddonUpdateRequest {
  name?: string
  description?: string
  billingCycle?: AddonBillingCycle
  unitPriceKes?: number
  quantity?: number
  status?: AddonStatus
  notes?: string
  metadata?: Record<string, unknown>
}
