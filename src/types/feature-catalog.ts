export type FeatureKind = 'FEATURE' | 'LIMIT'
export type FeatureValueType = 'bool' | 'int' | 'unlimited'

/** One entry in the platform-wide feature/limit catalog (per service). */
export interface FeatureDefinition {
  id: string
  featureCode: string
  serviceTag: string
  category: string
  label: string
  description?: string
  kind: FeatureKind
  valueType: FeatureValueType
  defaultLimit?: number
  isRateLimited: boolean
  unit?: string
  natsEvent?: string
  sortOrder: number
  isActive: boolean
}

export interface FeatureCatalogResponse {
  features: FeatureDefinition[]
  services: string[]
  count: number
}
