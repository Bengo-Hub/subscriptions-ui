import { apiClient } from './client'
import type { ServiceConfig, ServiceConfigCreateRequest, ServiceConfigUpdateRequest } from '@/types/config'

export const listConfigs = () =>
  apiClient.get<{ data: ServiceConfig[]; total: number }>('/api/v1/admin/configs')

export const createConfig = (req: ServiceConfigCreateRequest) =>
  apiClient.post<ServiceConfig>('/api/v1/admin/configs', {
    configKey: req.configKey,
    configValue: req.configValue,
    configType: req.configType ?? 'string',
    description: req.description,
    isSecret: req.isSecret ?? false,
  })

export const updateConfig = (id: string, req: ServiceConfigUpdateRequest) =>
  apiClient.put<ServiceConfig>(`/api/v1/admin/configs/${id}`, {
    configValue: req.configValue,
    configType: req.configType,
    description: req.description,
    isSecret: req.isSecret,
  })

export const deleteConfig = (id: string) =>
  apiClient.delete<void>(`/api/v1/admin/configs/${id}`)
