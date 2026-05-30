import { apiClient } from './client'
import type { Plan, PlanCreateRequest, PlanUpdateRequest } from '@/types/plan'

export const listPlans = (params?: { serviceTag?: string }) =>
  apiClient.get<Plan[]>('/api/v1/plans', params)

export const getPlan = (id: string) =>
  apiClient.get<Plan>(`/api/v1/plans/${id}`)

export const getPlanByCode = (code: string) =>
  apiClient.get<Plan>(`/api/v1/plans/code/${code}`)

export const adminCreatePlan = (req: PlanCreateRequest) =>
  apiClient.post<Plan>('/api/v1/admin/plans', req)

export const adminUpdatePlan = (id: string, req: PlanUpdateRequest) =>
  apiClient.put<Plan>(`/api/v1/admin/plans/${id}`, req)

export const adminDeletePlan = (id: string) =>
  apiClient.delete<void>(`/api/v1/admin/plans/${id}`)
