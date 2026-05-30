'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createConfig, deleteConfig, listConfigs, updateConfig } from '@/lib/api/configs'
import type { ServiceConfigCreateRequest, ServiceConfigUpdateRequest } from '@/types/config'

export function useConfigs() {
  return useQuery({
    queryKey: ['admin-configs'],
    queryFn: listConfigs,
    staleTime: 60_000,
  })
}

export function useCreateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: ServiceConfigCreateRequest) => createConfig(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-configs'] })
      toast.success('Config created')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: ServiceConfigUpdateRequest }) =>
      updateConfig(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-configs'] })
      toast.success('Config updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}

export function useDeleteConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteConfig(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-configs'] })
      toast.success('Config deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
