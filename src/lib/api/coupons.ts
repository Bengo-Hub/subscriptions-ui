import { apiClient } from './client'
import type { Coupon, CouponCreateRequest, CouponType } from '@/types/coupon'

function mapCoupon(raw: any): Coupon {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    description: raw.description,
    type: raw.type as CouponType,
    value: raw.value,
    applicablePlanCodes: raw.applicable_plan_codes ?? [],
    minPlanPrice: raw.min_plan_price ?? 0,
    maxUses: raw.max_uses ?? -1,
    usedCount: raw.used_count ?? 0,
    maxStacks: raw.max_stacks ?? 1,
    isActive: raw.is_active ?? false,
    validFrom: raw.valid_from,
    validUntil: raw.valid_until,
    createdAt: raw.created_at,
  }
}

export const listCoupons = async (params?: { active?: boolean }): Promise<{ data: Coupon[]; total: number }> => {
  const res = await apiClient.get<{ data: any[]; total: number }>('/api/v1/admin/coupons', params)
  return { data: (res.data ?? []).map(mapCoupon), total: res.total }
}

export const getCoupon = async (id: string): Promise<Coupon> => {
  const res = await apiClient.get<any>(`/api/v1/admin/coupons/${id}`)
  return mapCoupon(res)
}

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
