import { apiClient } from './client'
import type { ServiceConfig, ServiceConfigCreateRequest, ServiceConfigUpdateRequest } from '@/types/config'

export const listConfigs = () =>
  apiClient.get<{ data: ServiceConfig[]; total: number }>('/api/v1/admin/configs')

export const createConfig = (req: ServiceConfigCreateRequest) =>
  apiClient.post<ServiceConfig>('/api/v1/admin/configs', {
    config_key: req.configKey,
    config_value: req.configValue,
    config_type: req.configType ?? 'string',
    description: req.description,
    is_secret: req.isSecret ?? false,
  })

export const updateConfig = (id: string, req: ServiceConfigUpdateRequest) =>
  apiClient.put<ServiceConfig>(`/api/v1/admin/configs/${id}`, {
    config_value: req.configValue,
    config_type: req.configType,
    description: req.description,
    is_secret: req.isSecret,
  })

export const deleteConfig = (id: string) =>
  apiClient.delete<void>(`/api/v1/admin/configs/${id}`)
