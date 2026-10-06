import type { FeatureDefinition } from '@/types/feature-catalog'

// Plan shapes and the pure helpers both the tenant plan picker and the platform plan editor use.

export interface DiscountRule {
  // Aligned with backend plans.applyDiscountRules (type + percentage).
  type: 'YEARLY' | 'LOYALTY' | 'NEW_CUSTOMER'
  percentage: number
  description?: string
}

export interface PlanFeature {
  id?: string
  featureCode: string
  isIncluded: boolean
  limitValue?: number | null
  overageUnitPrice: number
}

export interface Plan {
  id: string
  planCode: string
  name: string
  description: string
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME'
  basePrice: number // per MONTH for recurring plans
  setupFee?: number // one-time setup/installation fee; waived on 6+ month billing periods
  currency: string
  isActive: boolean
  isPublic: boolean
  tierOrder: number
  tierLimits: Record<string, any>
  planType?: 'TIERED' | 'STANDALONE_SERVICE' | 'BUNDLE' | 'CUSTOM'
  serviceTag?: string
  // Business vertical this plan targets (retail, hospitality, pharmacy, ...). It tells apart
  // plans that share a group (POWERSUITE_HOSP_* vs POWERSUITE_DUKA_*). Absent = any tenant.
  useCase?: string | null
  freeTrialDays: number
  discountRules: DiscountRule[]
  features?: PlanFeature[]
}

export interface CurrentSubscription {
  id: string
  plan_code: string
  plan_name: string
  status: string // ACTIVE, TRIAL, EXPIRED, CANCELLED
  trial_ends_at: string | null
  current_period_end: string
}

/** The billing period (Monthly / 6 / 12 months) is chosen at checkout; the page only splits recurring from one-time. */
export type BillingKind = 'RECURRING' | 'ONE_TIME'

// Tabs are derived from the first segment of each plan code (POWERSUITE_GROWTH -> POWERSUITE), so a
// newly seeded plan family shows up without a code change.
export function planGroup(code: string | null | undefined): string {
  if (!code) return 'OTHER'
  // Legacy bare tier codes (STARTER/GROWTH/PROFESSIONAL) are Ordering plans.
  if (/^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(code)) return 'ORDERING'
  return (code.split('_')[0] || 'OTHER').toUpperCase()
}

const GROUP_LABEL: Record<string, string> = {
  ORDERING: 'Ordering', POS: 'POS', POWERSUITE: 'PowerSuite', INVENTORY: 'Inventory',
  ERP: 'ERP', LOGISTICS: 'Logistics', TRULOAD: 'TruLoad', TRANSPORTER: 'Transporter Portal',
  MARKETFLOW: 'MarketFlow', TREASURY: 'Treasury', PROJECTS: 'Projects', ISP: 'ISP Billing',
  LIBRARY: 'Library', AFYA: 'Codevertex Afya',
}

export function groupLabel(g: string): string {
  if (g === 'All') return 'All'
  return GROUP_LABEL[g] ?? g.charAt(0) + g.slice(1).toLowerCase()
}

// Preferred tab order; groups not listed are appended alphabetically.
const GROUP_ORDER = ['POWERSUITE', 'ORDERING', 'POS', 'INVENTORY', 'ERP', 'LIBRARY', 'LOGISTICS', 'TRULOAD', 'TRANSPORTER', 'MARKETFLOW', 'TREASURY', 'PROJECTS', 'ISP', 'AFYA']

export function sortGroups(groups: string[]): string[] {
  return [...groups].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a)
    const ib = GROUP_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

// Tenant use case -> relevant plan groups. Unknown / 'other' -> all groups.
export const USECASE_GROUPS: Record<string, string[]> = {
  isp: ['ISP', 'POWERSUITE'],
  hotspot: ['ISP', 'POWERSUITE'],
  hospitality: ['ORDERING', 'POS', 'INVENTORY', 'POWERSUITE'],
  retail: ['ORDERING', 'POS', 'INVENTORY', 'POWERSUITE'],
  quick_service: ['ORDERING', 'POS', 'INVENTORY', 'POWERSUITE'],
  grocery: ['ORDERING', 'POS', 'INVENTORY', 'POWERSUITE'],
  food_delivery: ['ORDERING', 'POS', 'INVENTORY', 'LOGISTICS', 'POWERSUITE'],
  e_commerce: ['ORDERING', 'INVENTORY', 'POWERSUITE'],
  pharmacy: ['POS', 'INVENTORY', 'POWERSUITE'],
  services: ['POS', 'INVENTORY', 'POWERSUITE'],
  hospital: ['AFYA'],
  warehouse: ['INVENTORY', 'POWERSUITE'],
  warehousing: ['INVENTORY', 'POWERSUITE'],
  manufacturing: ['INVENTORY', 'ERP', 'POWERSUITE'],
  logistics: ['LOGISTICS', 'POWERSUITE'],
  weighbridge: ['TRULOAD', 'TRANSPORTER'],
  commercial_weighing: ['TRULOAD', 'TRANSPORTER'],
  axle_load_enforcement: ['TRULOAD', 'TRANSPORTER'],
  fbo: ['MARKETFLOW', 'POWERSUITE'],
}

/** Strip the group segment (and _YEARLY / SUITE_) to a tier label: POWERSUITE_DUKA_PRO -> "Duka Pro". */
export function planTierLabel(planCode: string | null | undefined, group: string): string {
  if (!planCode) return '—'
  let s = planCode.replace(new RegExp('^' + group + '_'), '').replace(/_YEARLY$/, '')
  s = s.replace(/^SUITE_/, '')
  if (!s) s = planCode
  return s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export function isOneTimePlan(p: Plan): boolean {
  return (
    p.billingCycle === 'ONE_TIME' ||
    (!!p.planCode && (p.planCode.includes('ONE_TIME') || p.planCode.includes('LICENSE') || p.planCode.includes('_COMPLETE') || p.planCode.includes('_CREDITS_')))
  )
}

/** Retired per-year plan rows; the period is now picked at checkout on the recurring plan. */
export function isLegacyAnnualPlan(p: Plan): boolean {
  return p.billingCycle === 'ANNUAL' || (!!p.planCode && p.planCode.includes('YEARLY'))
}

export function isRecommended(code: string | null | undefined): boolean {
  if (!code) return false
  const u = code.toUpperCase()
  return u.includes('GROWTH') || u.includes('STANDARD') || u.includes('DEVICE_5')
}

export const cycleLabel: Record<string, string> = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-time' }

/**
 * The plans a tenant should see for one group and billing kind: public plans only, scoped to the
 * tenant's vertical (the tenant's own current plan always stays visible), legacy annual rows
 * dropped, cheapest tier first.
 */
export function plansForTenant(
  all: Plan[],
  group: string,
  kind: BillingKind,
  useCase: string,
  currentPlanCode?: string | null,
): Plan[] {
  return all
    .filter((p) => p.isPublic !== false)
    .filter(
      (p) =>
        planGroup(p.planCode) === group &&
        (!p.useCase || useCase === 'other' || p.useCase.toLowerCase() === useCase || p.planCode === currentPlanCode),
    )
    .filter((p) => (kind === 'ONE_TIME' ? isOneTimePlan(p) : !isLegacyAnnualPlan(p) && !isOneTimePlan(p)))
    .sort((a, b) => a.tierOrder - b.tierOrder)
}

// Catalog-derived feature and limit registry. GET /api/v1/features/catalog is the single source of
// truth for labels, categories, units and overage/internal flags, so they never drift from the API.

export type FeatureInfo = { label: string; category: string; serviceTag: string }
export type LimitInfo = { label: string; unit?: string; nats?: string; isOverage: boolean; serviceTag: string }
export type CatalogMaps = {
  featureInfo: Record<string, FeatureInfo>
  limitInfo: Record<string, LimitInfo>
  internal: Set<string>
  comparisonFeatures: string[]
}

export const EMPTY_CATALOG_MAPS: CatalogMaps = { featureInfo: {}, limitInfo: {}, internal: new Set(), comparisonFeatures: [] }

// Internal gateway-access codes ('Cross-Service Access') are hidden from comparisons, overage
// limits render in their own section, and Add-ons are left out. Order: service then sort order.
export function buildCatalogMaps(catalog: FeatureDefinition[]): CatalogMaps {
  const featureInfo: Record<string, FeatureInfo> = {}
  const limitInfo: Record<string, LimitInfo> = {}
  const internal = new Set<string>()
  const comparisonFeatures: string[] = []
  const sorted = [...catalog].sort((a, b) => a.serviceTag.localeCompare(b.serviceTag) || a.sortOrder - b.sortOrder)
  for (const c of sorted) {
    if (c.kind === 'LIMIT') {
      limitInfo[c.featureCode] = { label: c.label, unit: c.unit, nats: c.natsEvent, isOverage: c.category === 'Overage', serviceTag: c.serviceTag }
      continue
    }
    featureInfo[c.featureCode] = { label: c.label, category: c.category, serviceTag: c.serviceTag }
    if (c.category === 'Cross-Service Access') internal.add(c.featureCode)
    else if (c.category !== 'Add-ons') comparisonFeatures.push(c.featureCode)
  }
  return { featureInfo, limitInfo, internal, comparisonFeatures }
}
