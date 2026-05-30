export type AddonBillingCycle = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME'
export type AddonStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export interface CustomAddon {
  id: string
  tenantId: string
  name: string
  description?: string
  serviceCode?: string
  serviceAddonType?: string
  billingCycle: AddonBillingCycle
  unitPriceKes: number
  quantity: number
  status: AddonStatus
  notes?: string
  createdByUserId?: string
  createdAt: string
  updatedAt: string
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
}

export interface CustomAddonUpdateRequest {
  name?: string
  description?: string
  billingCycle?: AddonBillingCycle
  unitPriceKes?: number
  quantity?: number
  status?: AddonStatus
  notes?: string
}
