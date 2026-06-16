import { apiClient } from './client'

// BackupSettings is a tenant's auto-backup configuration. Auto-backup is OPT-IN:
// autoEnabled defaults to false, so nothing runs automatically until activated here.
export interface BackupSettings {
  auto_enabled: boolean
  schedule_hour: number
  retention_days: number
}

export const getBackupSettings = () =>
  apiClient.get<BackupSettings>('/api/v1/backups/settings')

export const updateBackupSettings = (req: BackupSettings) =>
  apiClient.put<BackupSettings>('/api/v1/backups/settings', req)
