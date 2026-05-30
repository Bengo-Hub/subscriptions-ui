'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '@/lib/api/coupons'
import type { CouponCreateRequest } from '@/types/coupon'

export function useCoupons(params?: { active?: boolean }) {
  return useQuery({
    queryKey: ['admin-coupons', params],
    queryFn: () => listCoupons(params),
    staleTime: 60_000,
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CouponCreateRequest) => createCoupon(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon created')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useUpdateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CouponCreateRequest> }) =>
      updateCoupon(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon deactivated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
