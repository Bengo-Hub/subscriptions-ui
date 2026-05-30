export interface ServiceConfig {
  id: string
  configKey: string
  configValue: string
  configType: string
  description?: string
  isSecret: boolean
  createdAt: string
  updatedAt: string
}

export interface ServiceConfigCreateRequest {
  configKey: string
  configValue: string
  configType?: string
  description?: string
  isSecret?: boolean
}

export interface ServiceConfigUpdateRequest {
  configValue?: string
  configType?: string
  description?: string
  isSecret?: boolean
}
