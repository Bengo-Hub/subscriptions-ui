'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminCreatePlan, adminDeletePlan, adminUpdatePlan, getPlan, listPlans } from '@/lib/api/plans'
import type { PlanCreateRequest, PlanUpdateRequest } from '@/types/plan'
import { apiClient } from '@/lib/api/client'
import type { Plan as CatalogPlan } from '@/lib/plans/catalog'

export function usePlans(params?: { serviceTag?: string }) {
  return useQuery({
    queryKey: ['plans', params],
    queryFn: () => listPlans(params),
    staleTime: 60_000,
  })
}

/**
 * Every plan (public and hidden), as the plan picker and the platform plan editor need them.
 * GET /plans returns { data, total }; limit 500 covers the whole catalogue in one call.
 */
export function useAllPlans() {
  return useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => apiClient.get<{ data: CatalogPlan[]; total: number }>('/api/v1/plans', { limit: 500 }).then((r) => r?.data ?? []),
    staleTime: 5 * 60_000,
  })
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plan', id],
    queryFn: () => getPlan(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useAdminCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: PlanCreateRequest) => adminCreatePlan(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan created')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useAdminUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: PlanUpdateRequest }) => adminUpdatePlan(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useAdminDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminDeletePlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
