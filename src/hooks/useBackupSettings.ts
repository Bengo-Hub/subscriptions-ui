'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBackupSettings, updateBackupSettings, type BackupSettings } from '@/lib/api/backups'

export function useBackupSettings(tenantKey?: string | null) {
  return useQuery({
    queryKey: ['backup-settings', tenantKey ?? null],
    queryFn: getBackupSettings,
    staleTime: 60_000,
  })
}

export function useUpdateBackupSettings(tenantKey?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: BackupSettings) => updateBackupSettings(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-settings', tenantKey ?? null] })
      toast.success('Backup settings saved')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e.message),
  })
}
