import { apiClient } from './client'
import type { FeatureCatalogResponse, FeatureDefinition } from '@/types/feature-catalog'

/** Fetch the platform feature/limit catalog, optionally scoped to one service. */
export const listFeatureCatalog = (params?: { service?: string; kind?: 'FEATURE' | 'LIMIT' }) =>
  apiClient.get<FeatureCatalogResponse>('/api/v1/features/catalog', params)

export interface UpsertFeatureDefinitionRequest {
  featureCode: string
  serviceTag: string
  category?: string
  label: string
  description?: string
  kind?: 'FEATURE' | 'LIMIT'
  valueType?: 'bool' | 'int' | 'unlimited'
  defaultLimit?: number | null
  isRateLimited?: boolean
  unit?: string
  natsEvent?: string
  sortOrder?: number
  isActive?: boolean
}

export const adminUpsertFeatureDefinition = (req: UpsertFeatureDefinitionRequest) =>
  apiClient.post<{ feature: FeatureDefinition }>('/api/v1/admin/feature-catalog', req)

export const adminDeleteFeatureDefinition = (id: string) =>
  apiClient.delete<void>(`/api/v1/admin/feature-catalog/${id}`)
