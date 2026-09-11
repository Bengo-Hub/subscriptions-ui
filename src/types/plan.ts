export type PlanType = 'TIERED' | 'STANDALONE_SERVICE' | 'BUNDLE' | 'CUSTOM'
export type PlanBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME'

// Matches the backend pricing engine (plans.applyDiscountRules), which switches on
// type ∈ {YEARLY, LOYALTY, NEW_CUSTOMER} and reads a `percentage` field.
export interface DiscountRule {
  type: 'YEARLY' | 'LOYALTY' | 'NEW_CUSTOMER'
  percentage: number
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
  setupFee: number
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

// Minimal shape CreatePlan's upsertFeatures accepts — only featureCode/isIncluded/limitValue
// are read on create; id/planId/overageUnitPrice/createdAt are server-assigned.
export interface PlanFeatureInput {
  featureCode: string
  isIncluded: boolean
  limitValue?: number
}

export interface PlanCreateRequest {
  planCode: string
  name: string
  description?: string
  billingCycle: PlanBillingCycle
  basePrice: number
  setupFee?: number
  currency?: string
  isActive?: boolean
  isPublic?: boolean
  tierOrder?: number
  tierLimits?: Record<string, number>
  planType?: PlanType
  serviceTag?: string
  useCase?: string
  freeTrialDays?: number
  discountRules?: DiscountRule[]
  // Backend already accepts this on create (repository_ent.go's upsertFeatures) — the custom
  // plan builder is what actually exercises it; every other existing caller omits it.
  features?: PlanFeatureInput[]
}

export interface PlanUpdateRequest {
  name?: string
  description?: string
  basePrice?: number
  setupFee?: number
  currency?: string
  isActive?: boolean
  isPublic?: boolean
  tierOrder?: number
  tierLimits?: Record<string, number>
  freeTrialDays?: number
  discountRules?: DiscountRule[]
}
