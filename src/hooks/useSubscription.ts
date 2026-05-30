'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, getSubscription, updateSettings } from '@/lib/api/subscriptions'
import type { SubscriptionSettings } from '@/types/subscription'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    staleTime: 60_000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useSubscriptionSettings() {
  return useQuery({
    queryKey: ['subscription-settings'],
    queryFn: getSettings,
    staleTime: 60_000,
  })
}

export function useUpdateSubscriptionSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<SubscriptionSettings>) => updateSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-settings'] })
      qc.invalidateQueries({ queryKey: ['subscription'] })
      toast.success('Settings saved')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update settings'),
  })
}
