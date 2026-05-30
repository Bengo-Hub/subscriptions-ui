export type CouponType = 'percentage' | 'fixed_kes' | 'free_months'

export interface Coupon {
  id: string
  code: string
  name: string
  description?: string
  type: CouponType
  value: number
  applicablePlanCodes: string[]
  minPlanPrice: number
  maxUses: number
  usedCount: number
  maxStacks: number
  isActive: boolean
  validFrom: string
  validUntil?: string
  createdAt: string
}

export interface CouponCreateRequest {
  code: string
  name: string
  description?: string
  type: CouponType
  value: number
  applicablePlanCodes?: string[]
  minPlanPrice?: number
  maxUses?: number
  maxStacks?: number
  isActive?: boolean
  validFrom?: string
  validUntil?: string
}
