export type PlanType = 'TIERED' | 'STANDALONE_SERVICE' | 'BUNDLE' | 'CUSTOM'
export type PlanBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME'

export interface DiscountRule {
  type: 'ANNUAL_DISCOUNT' | 'LOYALTY_DISCOUNT' | 'NEW_CUSTOMER'
  value: number
  description?: string
}

export interface PlanFeature {
  id: string
  planId: string
  featureCode: string
  isIncluded: boolean
  limitValue?: number
  overageUnitPrice: number
}

export interface Plan {
  id: string
  planCode: string
  name: string
  description: string
  billingCycle: PlanBillingCycle
  basePrice: number
  currency: string
  isActive: boolean
  isPublic: boolean
  tierOrder: number
  tierLimits: Record<string, number>
  planType: PlanType
  serviceTag?: string
  freeTrialDays: number
  discountRules: DiscountRule[]
  features?: PlanFeature[]
}

export interface PlanCreateRequest {
  planCode: string
  name: string
  description?: string
  billingCycle: PlanBillingCycle
  basePrice: number
  currency?: string
  isActive?: boolean
  isPublic?: boolean
  tierOrder?: number
  tierLimits?: Record<string, number>
  planType?: PlanType
  serviceTag?: string
  freeTrialDays?: number
  discountRules?: DiscountRule[]
}

export interface PlanUpdateRequest {
  name?: string
  description?: string
  basePrice?: number
  currency?: string
  isActive?: boolean
  isPublic?: boolean
  tierOrder?: number
  tierLimits?: Record<string, number>
  freeTrialDays?: number
  discountRules?: DiscountRule[]
}
