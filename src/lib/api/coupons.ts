import { apiClient } from './client'
import type { Coupon, CouponCreateRequest } from '@/types/coupon'

export const listCoupons = (params?: { active?: boolean }) =>
  apiClient.get<{ data: Coupon[]; total: number }>('/api/v1/admin/coupons', params)

export const getCoupon = (id: string) =>
  apiClient.get<Coupon>(`/api/v1/admin/coupons/${id}`)

export const createCoupon = (req: CouponCreateRequest) =>
  apiClient.post<Coupon>('/api/v1/admin/coupons', {
    code: req.code,
    name: req.name,
    description: req.description,
    type: req.type,
    value: req.value,
    applicable_plan_codes: req.applicablePlanCodes,
    min_plan_price: req.minPlanPrice,
    max_uses: req.maxUses,
    max_stacks: req.maxStacks,
    is_active: req.isActive ?? true,
    valid_from: req.validFrom,
    valid_until: req.validUntil,
  })

export const updateCoupon = (id: string, req: Partial<CouponCreateRequest>) =>
  apiClient.patch<Coupon>(`/api/v1/admin/coupons/${id}`, {
    name: req.name,
    description: req.description,
    value: req.value,
    applicable_plan_codes: req.applicablePlanCodes,
    min_plan_price: req.minPlanPrice,
    max_uses: req.maxUses,
    max_stacks: req.maxStacks,
    is_active: req.isActive,
    valid_from: req.validFrom,
    valid_until: req.validUntil,
  })

export const deleteCoupon = (id: string) =>
  apiClient.delete<{ status: string }>(`/api/v1/admin/coupons/${id}`)
