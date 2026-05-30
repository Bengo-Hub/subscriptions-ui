'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  assignPlan,
  listAdminSubscriptions,
  listAdminTenants,
  updateSubscriptionStatus,
} from '@/lib/api/tenants'
import { extendTrial } from '@/lib/api/subscriptions'

export function useAdminTenants() {
  return useQuery({
    queryKey: ['admin-tenants'],
    queryFn: listAdminTenants,
    staleTime: 60_000,
  })
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: listAdminSubscriptions,
    staleTime: 30_000,
  })
}

export function useAssignPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tenantId,
      planCode,
      billingCycle,
    }: {
      tenantId: string
      planCode: string
      billingCycle?: string
    }) => assignPlan(tenantId, { planCode, billingCycle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      toast.success('Plan assigned')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useUpdateSubscriptionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateSubscriptionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      toast.success('Status updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useExtendTrial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, trialEndsAt }: { tenantId: string; trialEndsAt: string }) =>
      extendTrial(tenantId, trialEndsAt),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['admin-tenant-detail', tenantId] })
      toast.success('Trial extended')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
