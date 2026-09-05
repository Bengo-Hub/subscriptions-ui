'use client';

/**
 * Unified Plans page.
 * - Platform owners: plan management (create / edit / delete) with service/cycle filters
 * - Tenant users: self-service subscribe / upgrade / downgrade cards
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { listFeatureCatalog } from '@/lib/api/feature-catalog';
import { fetchTenantBySlug } from '@/lib/tenant-api';
import type { FeatureDefinition } from '@/types/feature-catalog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Edit,
  Layout,
  Loader2,
  Package,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

// ─── Shared types ────────────────────────────────────────────────────────────

interface DiscountRule {
  // Aligned with backend plans.applyDiscountRules (type + percentage).
  type: 'YEARLY' | 'LOYALTY' | 'NEW_CUSTOMER';
  percentage: number;
  description?: string;
}

interface PlanFeature {
  id?: string;
  featureCode: string;
  isIncluded: boolean;
  limitValue?: number | null;
  overageUnitPrice: number;
}

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  basePrice: number; // per MONTH for recurring plans
  setupFee?: number; // one-time setup/installation fee; waived on 6+ month billing periods
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  tierOrder: number;
  tierLimits: Record<string, any>;
  planType?: 'TIERED' | 'STANDALONE_SERVICE' | 'BUNDLE' | 'CUSTOM';
  serviceTag?: string;
  // Business vertical this plan targets (retail, hospitality, pharmacy, ...) —
  // disambiguates plans that share a serviceTag/group but serve different verticals
  // (e.g. POWERSUITE_HOSP_* vs POWERSUITE_DUKA_* both group as "POWERSUITE"). Absent
  // = not vertical-specific, matches any tenant.
  useCase?: string | null;
  freeTrialDays: number;
  discountRules: DiscountRule[];
  features?: PlanFeature[];
}

interface CurrentSubscription {
  id: string;
  plan_code: string;   // snake_case from SubscriptionResult
  plan_name: string;
  status: string;      // uppercase: ACTIVE, TRIAL, EXPIRED, CANCELLED
  trial_ends_at: string | null;
  current_period_end: string;
}

type BillingTab = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';

// ─── Dynamic plan grouping ───────────────────────────────────────────────────
// Tabs and grouping are DERIVED from the first underscore segment of each plan
// code (e.g. POWERSUITE_GROWTH → "POWERSUITE", ISP_HOTSPOT_STARTER → "ISP"), so
// newly seeded plan families show up automatically without any code change.
function planGroup(code: string | null | undefined): string {
  if (!code) return 'OTHER';
  // Legacy bare tier codes (STARTER/GROWTH/PROFESSIONAL) are Ordering plans.
  if (/^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(code)) return 'ORDERING';
  return (code.split('_')[0] || 'OTHER').toUpperCase();
}

// Friendly tab labels; unknown groups title-case their segment automatically.
const GROUP_LABEL: Record<string, string> = {
  ORDERING: 'Ordering', POS: 'POS', POWERSUITE: 'PowerSuite', INVENTORY: 'Inventory',
  ERP: 'ERP', LOGISTICS: 'Logistics', TRULOAD: 'TruLoad', TRANSPORTER: 'Transporter Portal',
  MARKETFLOW: 'MarketFlow', TREASURY: 'Treasury', PROJECTS: 'Projects', ISP: 'ISP Billing',
  LIBRARY: 'Library', AFYA: 'Codevertex Afya',
};
function groupLabel(g: string): string {
  if (g === 'All') return 'All';
  return GROUP_LABEL[g] ?? (g.charAt(0) + g.slice(1).toLowerCase());
}

// Preferred tab order; groups not listed are appended alphabetically.
const GROUP_ORDER = ['POWERSUITE', 'ORDERING', 'POS', 'INVENTORY', 'ERP', 'LIBRARY', 'LOGISTICS', 'TRULOAD', 'TRANSPORTER', 'MARKETFLOW', 'TREASURY', 'PROJECTS', 'ISP', 'AFYA'];
function sortGroups(groups: string[]): string[] {
  return [...groups].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Tenant use-case → relevant plan groups. Unknown / 'other' → all groups.
const USECASE_GROUPS: Record<string, string[]> = {
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
};

// Strip the leading group segment (+ _YEARLY / redundant SUITE_) to a tier label.
function planTierLabel(planCode: string | null | undefined, group: string): string {
  if (!planCode) return '—';
  let s = planCode.replace(new RegExp('^' + group + '_'), '').replace(/_YEARLY$/, '');
  s = s.replace(/^SUITE_/, ''); // POS bundles read better without "Suite"
  if (!s) s = planCode;
  return s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function isOneTimePlan(p: Plan) {
  return p.billingCycle === 'ONE_TIME' || (p.planCode && (p.planCode.includes('ONE_TIME') || p.planCode.includes('LICENSE') || p.planCode.includes('_COMPLETE') || p.planCode.includes('_CREDITS_')));
}
function isAnnualPlan(p: Plan) { return p.billingCycle === 'ANNUAL' || (p.planCode && p.planCode.includes('YEARLY')); }
function isRecommended(code: string | null | undefined) {
  if (!code) return false;
  const u = code.toUpperCase();
  return u.includes('GROWTH') || u.includes('STANDARD') || u.includes('DEVICE_5');
}

const cycleLabel: Record<string, string> = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-Time' };
const cycleColor: Record<string, string> = {
  MONTHLY: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ANNUAL: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ONE_TIME: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

// ─── Catalog-derived feature & limit registry ────────────────────────────────
// The platform feature/limit catalog (feature_definitions, served by
// GET /api/v1/features/catalog) is the single source of truth for every feature
// and limit, tagged per service and typed (FEATURE | LIMIT). buildCatalogMaps
// turns a fetched catalog into the lookup maps this page renders from — labels,
// categories, units, overage/internal flags, and comparison order — so they stay
// in sync with the backend instead of being hard-coded here.

type FeatureInfo = { label: string; category: string; serviceTag: string };
type LimitInfo = { label: string; unit?: string; nats?: string; isOverage: boolean; serviceTag: string };
type CatalogMaps = {
  featureInfo: Record<string, FeatureInfo>;
  limitInfo: Record<string, LimitInfo>;
  internal: Set<string>;
  comparisonFeatures: string[];
};

const EMPTY_CATALOG_MAPS: CatalogMaps = { featureInfo: {}, limitInfo: {}, internal: new Set(), comparisonFeatures: [] };

// Build the lookup maps from a fetched catalog. Internal gateway-access codes
// (category 'Cross-Service Access') are hidden from the comparison table; overage
// limits (category 'Overage') render in their own section; Add-ons are excluded
// from the comparison list. Comparison order follows service_tag then sort_order.
function buildCatalogMaps(catalog: FeatureDefinition[]): CatalogMaps {
  const featureInfo: Record<string, FeatureInfo> = {};
  const limitInfo: Record<string, LimitInfo> = {};
  const internal = new Set<string>();
  const comparisonFeatures: string[] = [];
  const sorted = [...catalog].sort(
    (a, b) => a.serviceTag.localeCompare(b.serviceTag) || a.sortOrder - b.sortOrder,
  );
  for (const c of sorted) {
    if (c.kind === 'LIMIT') {
      limitInfo[c.featureCode] = {
        label: c.label,
        unit: c.unit,
        nats: c.natsEvent,
        isOverage: c.category === 'Overage',
        serviceTag: c.serviceTag,
      };
      continue;
    }
    featureInfo[c.featureCode] = { label: c.label, category: c.category, serviceTag: c.serviceTag };
    if (c.category === 'Cross-Service Access') internal.add(c.featureCode);
    else if (c.category !== 'Add-ons') comparisonFeatures.push(c.featureCode);
  }
  return { featureInfo, limitInfo, internal, comparisonFeatures };
}

// ─── Admin (platform owner) view ─────────────────────────────────────────────

const emptyForm: Partial<Plan> = { name: '', planCode: '', description: '', basePrice: 0, billingCycle: 'MONTHLY', currency: 'KES', isActive: true, isPublic: true, tierOrder: 1, tierLimits: {}, planType: 'TIERED', serviceTag: '', freeTrialDays: 14, discountRules: [] };

// Service tags as stored on plans / in the feature catalog (service_tag column).
const SERVICE_TAGS = ['ordering', 'pos', 'inventory', 'treasury', 'logistics', 'erp', 'marketflow', 'truload', 'transporter_portal', 'isp_billing', 'projects', 'platform'] as const;
const PLAN_TYPES = ['TIERED', 'STANDALONE_SERVICE', 'BUNDLE', 'CUSTOM'] as const;
const serviceTagLabel = (t: string) => t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
type TierLimitEntry = { key: string; value: string };
const toLimitEntries = (limits: Record<string, any>): TierLimitEntry[] => Object.entries(limits).map(([k, v]) => ({ key: k, value: String(v) }));
const fromLimitEntries = (entries: TierLimitEntry[]) => Object.fromEntries(entries.filter((e) => e.key.trim()).map(({ key, value }) => { const n = Number(value); return [key.trim(), isNaN(n) ? value : n]; }));

type FeatureEntry = { featureCode: string; isIncluded: boolean; limitValue: string; overageUnitPrice: string };

// ─── Catalog-driven feature/limit picker ─────────────────────────────────────
// Loads the platform feature catalog for a chosen service, grouped by category,
// and lets the platform owner toggle features (→ featureEntries) and limits
// (→ tierEntries) in/out of the plan. Keeps the manual editors below as a fallback.
function CatalogFeaturePicker({
  catalog,
  isLoading,
  selectedService,
  onSelectService,
  featureEntries,
  setFeatureEntries,
  tierEntries,
  setTierEntries,
}: {
  catalog: FeatureDefinition[];
  isLoading: boolean;
  selectedService: string;
  onSelectService: (s: string) => void;
  featureEntries: FeatureEntry[];
  setFeatureEntries: Dispatch<SetStateAction<FeatureEntry[]>>;
  tierEntries: TierLimitEntry[];
  setTierEntries: Dispatch<SetStateAction<TierLimitEntry[]>>;
}) {
  // 'all' (the default) shows every service grouped under its own heading; a
  // specific tag scopes to that service. Either way entries are grouped service →
  // category so features and limits load together under the right service label.
  const services = ['all', ...Array.from(new Set(catalog.map((c) => c.serviceTag))).sort()];
  const isAll = selectedService === 'all';
  const scoped = isAll ? catalog : catalog.filter((c) => c.serviceTag === selectedService);
  const byService = scoped.reduce<Record<string, Record<string, FeatureDefinition[]>>>((acc, f) => {
    const svc = (acc[f.serviceTag] ??= {});
    (svc[f.category] ??= []).push(f);
    return acc;
  }, {});
  const serviceOrder = Object.keys(byService).sort();

  const hasFeature = (code: string) => featureEntries.some((e) => e.featureCode === code && e.isIncluded);
  const hasLimit = (code: string) => tierEntries.some((e) => e.key === code);

  const toggleFeature = (f: FeatureDefinition) => {
    setFeatureEntries((prev) => {
      if (prev.some((e) => e.featureCode === f.featureCode)) {
        return prev.filter((e) => e.featureCode !== f.featureCode);
      }
      return [...prev, { featureCode: f.featureCode, isIncluded: true, limitValue: '', overageUnitPrice: '0' }];
    });
  };

  const toggleLimit = (f: FeatureDefinition) => {
    setTierEntries((prev) => {
      if (prev.some((e) => e.key === f.featureCode)) {
        return prev.filter((e) => e.key !== f.featureCode);
      }
      const def = f.defaultLimit != null ? String(f.defaultLimit) : '-1';
      return [...prev, { key: f.featureCode, value: def }];
    });
  };

  const inPlanCount = scoped.filter((f) => (f.kind === 'LIMIT' ? hasLimit(f.featureCode) : hasFeature(f.featureCode))).length;

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Features from Catalog</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{inPlanCount} of {scoped.length} in plan</span>
          <select
            value={selectedService}
            onChange={(e) => onSelectService(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs font-medium"
          >
            {services.length <= 1 && <option value="all">No services</option>}
            {services.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Services' : serviceTagLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground italic">Loading catalog…</p>
      ) : scoped.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No catalog features for this service. Run the seed to populate the catalog, or use the manual editors below.</p>
      ) : (
        <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
          {serviceOrder.map((svc) => (
            <div key={svc} className="space-y-2">
              {isAll && (
                <p className="text-xs font-bold uppercase tracking-wide text-primary sticky top-0 bg-card py-1 border-b border-border/60">
                  {serviceTagLabel(svc)}
                </p>
              )}
              {Object.entries(byService[svc]).map(([category, defs]) => (
                <div key={category} className="space-y-1.5">
                  <p className={cn('text-[11px] font-semibold text-foreground/80 py-1', !isAll && 'sticky top-0 bg-card')}>{category}</p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {defs.map((f) => {
                      const isLimit = f.kind === 'LIMIT';
                      const active = isLimit ? hasLimit(f.featureCode) : hasFeature(f.featureCode);
                      return (
                        <label
                          key={f.featureCode}
                          className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors', active ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-accent/40')}
                          title={f.description || f.featureCode}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => (isLimit ? toggleLimit(f) : toggleFeature(f))}
                            className="h-3.5 w-3.5 rounded mt-0.5 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium truncate">{f.label}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono truncate">
                              {f.featureCode}{isLimit ? ` · limit${f.unit ? ' ' + f.unit : ''}` : ''}{f.isRateLimited ? ' · metered' : ''}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPlansView() {
  const qc = useQueryClient();
  const [serviceTab, setServiceTab] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>(emptyForm);
  const [tierEntries, setTierEntries] = useState<TierLimitEntry[]>([]);
  const [featureEntries, setFeatureEntries] = useState<FeatureEntry[]>([]);
  const [catalogService, setCatalogService] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['plans-admin'],
    queryFn: () => apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans', { limit: 500 }).then((r) => r.data ?? []),
  });

  // Platform feature/limit catalog — powers the service-grouped feature picker.
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: () => listFeatureCatalog().then((r) => r.features ?? []),
    staleTime: 5 * 60 * 1000,
  });
  const catalog = catalogData ?? [];

  const plans = (data ?? []).filter((p) => serviceTab === 'All' || planGroup(p.planCode) === serviceTab);
  // Admin tabs are derived from the groups actually present (never hardcoded).
  const adminTabs = ['All', ...sortGroups([...new Set((data ?? []).map((p) => planGroup(p.planCode)))])];

  const createMutation = useMutation({
    mutationFn: (body: Partial<Plan>) => apiClient.post('/api/v1/admin/plans', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans-admin'] }); toast.success('Plan created'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create plan'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Plan> }) => apiClient.put(`/api/v1/admin/plans/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans-admin'] }); toast.success('Plan updated'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update plan'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans-admin'] }); toast.success('Plan deleted'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete plan'),
  });

  const openCreate = () => { setEditingPlan(null); setForm(emptyForm); setTierEntries([]); setFeatureEntries([]); setCatalogService('all'); setShowForm(true); };

  // Fetch plan by ID for fresh data (bypasses service list cache) so freeTrialDays and
  // feature overageUnitPrice are always current even right after an update.
  const openEdit = async (p: Plan) => {
    setEditingPlan(p);
    setShowForm(true);
    try {
      const fresh = await apiClient.get<{ plan: Plan } | Plan>(`/api/v1/plans/${p.id}`);
      const planData: Plan = (fresh as any)?.plan ?? (fresh as Plan);
      setForm({ ...planData, freeTrialDays: planData.freeTrialDays, isPublic: planData.isPublic ?? true, discountRules: planData.discountRules ?? [] });
      // Default the catalog picker to "All Services" so every service's features/limits
      // are visible and grouped — bundle plans (e.g. COMPLETE_*) span multiple services.
      setCatalogService('all');
      setTierEntries(toLimitEntries(planData.tierLimits ?? {}));
      setFeatureEntries((planData.features ?? []).map((f) => ({
        featureCode: f.featureCode,
        isIncluded: f.isIncluded,
        limitValue: f.limitValue != null ? String(f.limitValue) : '',
        overageUnitPrice: String(f.overageUnitPrice ?? 0),
      })));
    } catch {
      setForm({ ...p, freeTrialDays: p.freeTrialDays, isPublic: p.isPublic ?? true, discountRules: p.discountRules ?? [] });
      setTierEntries(toLimitEntries(p.tierLimits ?? {}));
      setFeatureEntries((p.features ?? []).map((f) => ({
        featureCode: f.featureCode,
        isIncluded: f.isIncluded,
        limitValue: f.limitValue != null ? String(f.limitValue) : '',
        overageUnitPrice: String(f.overageUnitPrice ?? 0),
      })));
    }
  };

  const closeForm = () => { setShowForm(false); setEditingPlan(null); };

  const toFeaturePayload = (entries: FeatureEntry[]): PlanFeature[] =>
    entries.filter((e) => e.featureCode.trim()).map((e) => ({
      featureCode: e.featureCode.trim(),
      isIncluded: e.isIncluded,
      limitValue: e.limitValue !== '' ? Number(e.limitValue) : null,
      overageUnitPrice: Number(e.overageUnitPrice) || 0,
    }));

  const handleSubmit = () => {
    const payload = { ...form, tierLimits: fromLimitEntries(tierEntries), features: toFeaturePayload(featureEntries) };
    if (editingPlan) updateMutation.mutate({ id: editingPlan.id, body: payload });
    else createMutation.mutate(payload);
  };
  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage subscription plans across all service groups.</p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> New Plan
        </Button>
      </div>

      {/* Service tabs */}
      <div className="flex gap-1 p-1 bg-accent/50 rounded-2xl w-fit flex-wrap">
        {adminTabs.map((t) => (
          <button key={t} onClick={() => setServiceTab(t)}
            className={cn('px-4 py-1.5 rounded-xl text-xs font-semibold transition-all', serviceTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {groupLabel(t)}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingPlan ? `Edit — ${editingPlan.name}` : 'New Plan'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan Code</label>
                <Input value={form.planCode} onChange={(e) => setForm((p) => ({ ...p, planCode: e.target.value.toUpperCase() }))} placeholder="e.g. LOGISTICS_STARTER" className="h-11 rounded-xl font-mono" disabled={!!editingPlan} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price (KES)</label>
                <Input type="number" value={form.basePrice} onChange={(e) => setForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Billing Cycle</label>
                <select value={form.billingCycle} onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value as Plan['billingCycle'] }))} className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium">
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="ONE_TIME">One-Time</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan Type</label>
                <select value={form.planType ?? 'TIERED'} onChange={(e) => setForm((p) => ({ ...p, planType: e.target.value as Plan['planType'] }))} className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium">
                  {PLAN_TYPES.map((t) => <option key={t} value={t}>{serviceTagLabel(t.toLowerCase())}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service</label>
                <select
                  value={form.serviceTag ?? ''}
                  onChange={(e) => { const v = e.target.value; setForm((p) => ({ ...p, serviceTag: v })); if (v) setCatalogService(v); }}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
                  <option value="">— Bundle / Platform-wide —</option>
                  {SERVICE_TAGS.map((t) => <option key={t} value={t}>{serviceTagLabel(t)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short plan summary..." className="h-11 rounded-xl" />
              </div>
              <div className="flex flex-col gap-3 pb-0.5">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isPublic ?? true} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Public</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Tier Order</label>
                    <Input type="number" value={form.tierOrder} onChange={(e) => setForm((p) => ({ ...p, tierOrder: Number(e.target.value) }))} className="h-9 w-20 rounded-lg text-center" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={(form.freeTrialDays ?? 14) > 0} onChange={(e) => setForm((p) => ({ ...p, freeTrialDays: e.target.checked ? 14 : 0 }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Free trial</span>
                  </label>
                  {(form.freeTrialDays ?? 14) > 0 && (
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={365} value={form.freeTrialDays ?? 14} onChange={(e) => setForm((p) => ({ ...p, freeTrialDays: Number(e.target.value) }))} className="h-9 w-20 rounded-lg text-center" />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Catalog-driven feature/limit picker (service-grouped, categorized) */}
            <CatalogFeaturePicker
              catalog={catalog}
              isLoading={catalogLoading}
              selectedService={catalogService}
              onSelectService={setCatalogService}
              featureEntries={featureEntries}
              setFeatureEntries={setFeatureEntries}
              tierEntries={tierEntries}
              setTierEntries={setTierEntries}
            />

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tier Limits</label>
                <Button variant="outline" size="sm" onClick={() => setTierEntries((p) => [...p, { key: '', value: '' }])} className="h-8 rounded-lg text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Limit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use <code className="bg-accent px-1 rounded">-1</code> for unlimited.</p>
              {tierEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No limits configured.</p>
              ) : tierEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="key (e.g. max_riders)" value={entry.key} onChange={(e) => setTierEntries((p) => p.map((en, idx) => idx === i ? { ...en, key: e.target.value } : en))} className="h-9 rounded-lg font-mono text-xs flex-1" />
                  <Input placeholder="value (e.g. 5 or -1)" value={entry.value} onChange={(e) => setTierEntries((p) => p.map((en, idx) => idx === i ? { ...en, value: e.target.value } : en))} className="h-9 rounded-lg font-mono text-xs w-36" />
                  <Button variant="ghost" size="icon" onClick={() => setTierEntries((p) => p.filter((_, idx) => idx !== i))} className="h-9 w-9 rounded-lg hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            {/* Features / Overage Pricing */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Features &amp; Overage Pricing</label>
                <Button variant="outline" size="sm" onClick={() => setFeatureEntries((p) => [...p, { featureCode: '', isIncluded: true, limitValue: '', overageUnitPrice: '0' }])} className="h-8 rounded-lg text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Feature
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Set overage price per unit above the limit (0 = not billable).</p>
              {featureEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No features configured.</p>
              ) : featureEntries.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="feature_code (e.g. rider_app)"
                    value={f.featureCode}
                    onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => idx === i ? { ...en, featureCode: e.target.value } : en))}
                    className="h-9 rounded-lg font-mono text-xs flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <input
                      type="checkbox"
                      checked={f.isIncluded}
                      onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => idx === i ? { ...en, isIncluded: e.target.checked } : en))}
                      className="h-3.5 w-3.5 rounded"
                    />
                    Included
                  </label>
                  <Input
                    type="number"
                    placeholder="limit"
                    value={f.limitValue}
                    onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => idx === i ? { ...en, limitValue: e.target.value } : en))}
                    className="h-9 rounded-lg font-mono text-xs w-24"
                    title="Limit value (blank = none)"
                  />
                  <Input
                    type="number"
                    placeholder="overage KES"
                    value={f.overageUnitPrice}
                    onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => idx === i ? { ...en, overageUnitPrice: e.target.value } : en))}
                    className="h-9 rounded-lg font-mono text-xs w-28"
                    title="Overage unit price (KES)"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setFeatureEntries((p) => p.filter((_, idx) => idx !== i))} className="h-9 w-9 rounded-lg hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>

            {/* Discount rules */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Rules</label>
                <Button variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, discountRules: [...(p.discountRules ?? []), { type: 'YEARLY', percentage: 0 }] }))} className="h-8 rounded-lg text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Discount
                </Button>
              </div>
              {(form.discountRules ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No discount rules.</p>
              ) : (form.discountRules ?? []).map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={d.type}
                    onChange={(e) => setForm((p) => ({ ...p, discountRules: (p.discountRules ?? []).map((en, idx) => idx === i ? { ...en, type: e.target.value as DiscountRule['type'] } : en) }))}
                    className="h-9 rounded-lg border border-input bg-transparent px-2 text-xs font-medium flex-1"
                  >
                    <option value="YEARLY">Annual</option>
                    <option value="LOYALTY">Loyalty</option>
                    <option value="NEW_CUSTOMER">New Customer</option>
                  </select>
                  <Input type="number" placeholder="% off" value={d.percentage} onChange={(e) => setForm((p) => ({ ...p, discountRules: (p.discountRules ?? []).map((en, idx) => idx === i ? { ...en, percentage: Number(e.target.value) } : en) }))} className="h-9 rounded-lg font-mono text-xs w-28" title="Percentage off" />
                  <Button variant="ghost" size="icon" onClick={() => setForm((p) => ({ ...p, discountRules: (p.discountRules ?? []).filter((_, idx) => idx !== i) }))} className="h-9 w-9 rounded-lg hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy} className="rounded-xl h-10 px-6 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans table */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">{serviceTab === 'All' ? 'All Plans' : `${serviceTab} Plans`}</h2>
            </div>
            <span className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : plans.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    {['Plan', 'Code', 'Service', 'Type', 'Price', 'Cycle', 'Limits', 'Status', ''].map((h) => (
                      <TableHead key={h} className={cn('py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground', h === '' && 'text-right pr-6')}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.sort((a, b) => a.tierOrder - b.tierOrder || (a.planCode ?? '').localeCompare(b.planCode ?? '')).map((p) => (
                    <TableRow key={p.id} className="border-border/50 hover:bg-accent/50">
                      <TableCell className="py-4 pl-6">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-50">{p.description}</div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{p.planCode ?? '—'}</code></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">{groupLabel(planGroup(p.planCode))}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-medium text-muted-foreground">{(p.planType ?? 'TIERED').replace('_', ' ').toLowerCase()}</span>
                        {p.billingCycle === 'ONE_TIME' && <span className="ml-1 text-[9px] font-bold uppercase text-purple-600 dark:text-purple-400">· perpetual</span>}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">{(p.basePrice ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', cycleColor[p.billingCycle])}>{cycleLabel[p.billingCycle]}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{Object.keys(p.tierLimits ?? {}).length} limits</TableCell>
                      <TableCell>
                        <div className={cn('w-2 h-2 rounded-full inline-block', p.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                        <span className="ml-1.5 text-xs text-muted-foreground">{p.isActive ? 'Live' : 'Hidden'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">No plans found{serviceTab !== 'All' ? ` for ${serviceTab}` : ''}.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tenant self-service view ─────────────────────────────────────────────────

function TenantPlansView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceParam = searchParams.get('service');
  const planParam = searchParams.get('plan');

  const [activeService, setActiveService] = useState<string>('');
  const [billingTab, setBillingTab] = useState<BillingTab>('MONTHLY');
  const highlightPlanCode = planParam ?? null;

  // The current tenant's use case decides which plan groups are relevant.
  const { data: tenantBrand } = useQuery({
    queryKey: ['tenant-brand'],
    queryFn: () => {
      const slug = typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null;
      return slug ? fetchTenantBySlug(slug) : Promise.resolve(null);
    },
    staleTime: 300_000,
  });
  const useCase = (tenantBrand?.useCase ?? 'other').toLowerCase();

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans', { limit: 500 }),
    staleTime: 300_000,
  });

  // Platform feature/limit catalog — drives the comparison table's labels, units,
  // categories and overage/internal flags (shared query key dedupes with the admin view).
  const { data: catalogData } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: () => listFeatureCatalog().then((r) => r.features ?? []),
    staleTime: 5 * 60 * 1000,
  });
  const catalog = catalogData ?? [];
  const { featureInfo, limitInfo, internal, comparisonFeatures } = useMemo(
    () => (catalog.length ? buildCatalogMaps(catalog) : EMPTY_CATALOG_MAPS),
    [catalog],
  );

  // Tenant self-service view shows PUBLIC plans only — is_public=false rows (e.g. the
  // SUPPORT_{FAM}_{TIER} annual-support plans, sold by the platform owner alongside
  // licenses) never render here. The admin editor still lists them.
  const allPlans: Plan[] = (plansResponse?.data ?? []).filter((p) => p.isPublic !== false);

  // Visible groups = use-case-relevant groups ∪ already-subscribed group(s),
  // limited to groups that actually have plans. Unknown use case → all groups.
  const groupsPresent = [...new Set(allPlans.map((p) => planGroup(p.planCode)))];
  const subscribedGroup = currentSub?.plan_code ? planGroup(currentSub.plan_code) : null;
  const allowedGroups = USECASE_GROUPS[useCase];
  const visibleGroups = sortGroups(
    groupsPresent.filter((g) => !allowedGroups || allowedGroups.includes(g) || g === subscribedGroup),
  );

  // Resolve the active tab to a visible group (honour ?service= when relevant).
  const paramGroup = serviceParam
    ? planGroup(serviceParam.replace(/-/g, '_').toUpperCase() + '_')
    : null;
  const defaultGroup = (paramGroup && visibleGroups.includes(paramGroup))
    ? paramGroup
    : (visibleGroups[0] ?? 'ORDERING');
  const activeGroup = activeService && visibleGroups.includes(activeService) ? activeService : defaultGroup;

  // Within a group, further scope to the tenant's own use_case — this is the actual
  // fix for the reported bug: POWERSUITE_HOSP_*/DUKA_*/DAWA_* all group as
  // "POWERSUITE" (same service_tag on the backend), so grouping alone can't tell a
  // retail plan apart from a hospitality/pharmacy one. A plan with no useCase set
  // (not vertical-specific) always matches; the tenant's own already-subscribed plan
  // is always kept visible even if its useCase no longer matches (e.g. after a
  // vertical change), mirroring subscribedGroup's allowance above.
  const servicePlans = allPlans.filter((p) =>
    planGroup(p.planCode) === activeGroup &&
    (!p.useCase || useCase === 'other' || p.useCase.toLowerCase() === useCase || p.planCode === currentSub?.plan_code),
  );
  const hasOneTime = servicePlans.some((p) => isOneTimePlan(p));

  // Billing periods (Monthly / 6 Months / 12 Months) are chosen at checkout on one
  // recurring plan — the legacy per-cycle ANNUAL plan rows are retired, so only
  // recurring (monthly-priced) and one-time plans are displayed.
  const displayPlans = servicePlans
    .filter((p) => {
      if (billingTab === 'ONE_TIME') return isOneTimePlan(p);
      if (billingTab === 'ANNUAL') return isAnnualPlan(p) && !isOneTimePlan(p);
      return !isAnnualPlan(p) && !isOneTimePlan(p);
    })
    .sort((a, b) => a.tierOrder - b.tierOrder);

  const isAnnual = billingTab === 'ANNUAL';

  // Current subscription uses snake_case from backend
  const currentPlanCode = currentSub?.plan_code ?? null;
  const currentStatus = currentSub?.status ?? null;
  const isExpiredCurrent = (code: string) => currentPlanCode === code && currentStatus === 'EXPIRED';
  const isCurrentPlan = (code: string) => currentPlanCode === code && currentStatus !== 'EXPIRED';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header section */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Subscription Plans</span>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Choose your plan
              </h1>
              <p className="text-muted-foreground mt-2 max-w-lg">
                Flexible plans for every stage of growth. Upgrade, downgrade, or cancel anytime.
              </p>
            </div>
            {currentSub && (
              <div className="flex-shrink-0 bg-card border border-border rounded-2xl p-4 min-w-52">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Current Plan</p>
                <p className="text-base font-bold text-foreground">{currentSub.plan_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full',
                    currentStatus === 'ACTIVE' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    currentStatus === 'TRIAL' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                    currentStatus === 'EXPIRED' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                    !currentStatus && 'bg-muted text-muted-foreground',
                  )}>
                    {currentStatus ?? 'Unknown'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Service tabs */}
        <div className="flex flex-wrap gap-1 p-1.5 bg-muted/50 border border-border rounded-2xl w-fit mb-6">
          {visibleGroups.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveService(tab); setBillingTab('MONTHLY'); }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                activeGroup === tab
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
              )}
            >
              {groupLabel(tab)}
            </button>
          ))}
        </div>

        {/* Billing type toggle — the billing PERIOD (Monthly / 6 Months / 12 Months) is
            chosen at checkout on one recurring plan; annual plan rows are retired. */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 border border-border rounded-xl w-fit mb-4">
          {(['MONTHLY'] as BillingTab[]).concat(hasOneTime ? ['ONE_TIME'] : []).map((tab) => (
            <button
              key={tab}
              onClick={() => setBillingTab(tab)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                billingTab === tab
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'MONTHLY' ? 'Recurring' : 'One-Time'}
            </button>
          ))}
        </div>

        {/* Setup-fee waiver banner — every recurring plan is available Monthly / 6 Months /
            12 Months at checkout; 6+ months up front waives the one-time setup fee. */}
        {billingTab !== 'ONE_TIME' && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 max-w-3xl">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-foreground font-medium">
              Every plan is available <strong>Monthly</strong>, for <strong>6 Months</strong> or for <strong>12 Months</strong> — choose your billing period at checkout.
              Pay for <strong>6 months or more</strong> and your <strong>one-time setup fee is waived</strong>.
            </p>
          </div>
        )}

        {/* Plan cards */}
        {plansLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-24 bg-muted rounded animate-pulse" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-4 w-full bg-muted rounded animate-pulse" />)}
                  </div>
                  <div className="h-11 w-full bg-muted rounded-xl animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayPlans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No plans available for this selection.</p>
          </div>
        ) : (
          <div className={cn(
            'grid gap-6 mb-12',
            displayPlans.length === 1 ? 'grid-cols-1 max-w-sm' :
            displayPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          )}>
            {displayPlans.map((plan, planIdx) => {
              const isCurrent = isCurrentPlan(plan.planCode);
              const isExpired = isExpiredCurrent(plan.planCode);
              const isHighlighted = !isCurrent && plan.planCode === highlightPlanCode;
              const recommended = isRecommended(plan.planCode) && !isCurrent && !isHighlighted;
              const displayName = planTierLabel(plan.planCode, activeGroup);
              const prevPlan = planIdx > 0 ? displayPlans[planIdx - 1] : undefined;

              const allLimitEntries = Object.entries(plan.tierLimits ?? {});
              const prevLimits = prevPlan?.tierLimits ?? {};
              const newOrImprovedLimits = prevPlan
                ? allLimitEntries.filter(([key, val]) => {
                    const prev = prevLimits[key];
                    if (prev === undefined) return true;
                    if (val === -1 && prev !== -1) return true;
                    if (typeof val === 'number' && typeof prev === 'number') return val > prev;
                    return false;
                  })
                : allLimitEntries;

              // CTA button logic
              const curSubPlan = allPlans.find((p) => p.planCode === currentPlanCode);
              let btnLabel: string;
              let btnAction: () => void;
              let btnDisabled = false;
              let btnVariant: 'primary' | 'outline' | 'secondary' = recommended ? 'primary' : 'outline';

              if (isCurrent && !isExpired) {
                btnLabel = 'Current Plan';
                btnAction = () => {};
                btnDisabled = true;
              } else if (isExpired) {
                btnLabel = 'Renew Plan';
                btnAction = () => router.push(`/subscribe?plan=${plan.planCode}`);
              } else if (!currentSub) {
                btnLabel = 'Get Started';
                btnAction = () => router.push(`/subscribe?plan=${plan.planCode}`);
              } else if (!curSubPlan || planGroup(plan.planCode) !== planGroup(currentPlanCode)) {
                // No current plan found, or different service group — treat as fresh subscribe
                btnLabel = 'Subscribe';
                btnAction = () => router.push(`/subscribe?plan=${plan.planCode}`);
              } else if (plan.tierOrder > curSubPlan.tierOrder) {
                btnLabel = 'Upgrade';
                btnAction = () => router.push(`/upgrade?plan=${plan.planCode}`);
              } else {
                // Same service group, lower or equal tier
                btnLabel = 'Downgrade';
                btnAction = () => router.push(`/downgrade?plan=${plan.planCode}`);
              }

              const limitsToShow = (newOrImprovedLimits.length > 0 ? newOrImprovedLimits : allLimitEntries).slice(0, 5);

              return (
                <div key={plan.id} className="relative flex flex-col">
                  {/* Badge above card */}
                  {(recommended || isCurrent || isExpired || isHighlighted) && (
                    <div className="flex justify-center mb-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
                        recommended && 'bg-primary text-primary-foreground',
                        isCurrent && !isExpired && 'bg-blue-600 text-white',
                        isExpired && 'bg-red-500 text-white',
                        isHighlighted && !isCurrent && !isExpired && 'bg-primary/10 text-primary border border-primary/20',
                      )}>
                        {recommended && <Star className="h-3 w-3" />}
                        {recommended && 'Recommended'}
                        {isCurrent && !isExpired && 'Current Plan'}
                        {isExpired && 'Expired'}
                        {isHighlighted && !isCurrent && !isExpired && 'Your Selection'}
                      </span>
                    </div>
                  )}

                  <Card className={cn(
                    'flex-1 flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden',
                    isCurrent && !isExpired && 'ring-2 ring-blue-500 border-blue-500',
                    isHighlighted && !isCurrent && 'ring-2 ring-primary border-primary',
                    recommended && !isCurrent && !isHighlighted && 'border-primary/40 shadow-lg shadow-primary/5',
                    !isCurrent && !isHighlighted && !recommended && 'border-border hover:border-muted-foreground/30',
                  )}>
                    {/* Card top accent */}
                    <div className={cn(
                      'h-1',
                      isCurrent && !isExpired ? 'bg-blue-500' :
                      isHighlighted ? 'bg-primary' :
                      recommended ? 'bg-primary' :
                      'bg-border',
                    )} />

                    <CardContent className="p-6 flex flex-col flex-1">
                      {/* Plan name + price */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-foreground mb-3">{displayName}</h3>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-3xl font-black text-foreground">
                            {billingTab === 'ONE_TIME'
                              ? `KES ${(plan.basePrice ?? 0).toLocaleString()}`
                              : `KES ${(isAnnual ? Math.round((plan.basePrice ?? 0) / 12) : (plan.basePrice ?? 0)).toLocaleString()}`
                            }
                          </span>
                          {billingTab !== 'ONE_TIME' && (
                            <span className="text-sm text-muted-foreground font-medium">/mo</span>
                          )}
                        </div>
                        {isAnnual && (
                          <p className="text-xs text-muted-foreground">
                            Billed KES {(plan.basePrice ?? 0).toLocaleString()} / year
                          </p>
                        )}
                        {billingTab === 'ONE_TIME' && (
                          <p className="text-xs text-muted-foreground">One-time payment</p>
                        )}
                        {billingTab !== 'ONE_TIME' && (plan.setupFee ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            + KES {(plan.setupFee ?? 0).toLocaleString()} one-time setup fee
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold"> — waived on 6+ month billing</span>
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed min-h-10">{plan.description}</p>
                      </div>

                      {/* Features / limits */}
                      <div className="flex-1 mb-6 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
                          {prevPlan
                            ? `Everything in ${planTierLabel(prevPlan.planCode, activeGroup)}, plus:`
                            : "What's included"}
                        </p>
                        {prevPlan && (
                          <div className="flex items-center gap-2 py-1 opacity-60">
                            <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              All {planTierLabel(prevPlan.planCode, activeGroup)} features
                            </span>
                          </div>
                        )}
                        {limitsToShow
                          .filter(([key]) => !limitInfo[key]?.isOverage)
                          .map(([key, val]) => {
                            const info = limitInfo[key];
                            const label = info
                              ? `${info.label}${info.unit ? ` ${info.unit}` : ''}`
                              : key.replace(/_/g, ' ');
                            return (
                              <div key={key} className="flex items-center gap-2 py-0.5">
                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="h-2.5 w-2.5 text-primary" />
                                </div>
                                <span className="text-sm text-foreground">
                                  <span className="font-semibold">
                                    {val === -1 ? 'Unlimited' : Number(val).toLocaleString()}
                                  </span>{' '}
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        {allLimitEntries.length > 5 && (
                          <p className="text-xs text-muted-foreground pl-6">
                            +{allLimitEntries.length - 5} more included
                          </p>
                        )}
                      </div>

                      {/* CTA button */}
                      <Button
                        variant={btnVariant}
                        className={cn(
                          'w-full h-11 rounded-xl font-semibold transition-all',
                          btnDisabled && 'opacity-50 cursor-default pointer-events-none',
                          isExpired && 'bg-red-500 hover:bg-red-600 text-white border-red-500',
                          isCurrent && !isExpired && 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                        )}
                        disabled={btnDisabled}
                        onClick={btnAction}
                      >
                        {btnLabel}
                        {!btnDisabled && <ChevronRight className="h-4 w-4 ml-1" />}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature comparison table (catalog-driven — gated on the catalog being loaded
            so labels/categories render from feature_definitions, not raw codes) */}
        {!plansLoading && catalog.length > 0 && displayPlans.length > 1 && (() => {
          // ── Limits (numeric, NATS-tracked) ──────────────────────────────────
          const allLimitKeys = Array.from(
            new Set(displayPlans.flatMap((p) => Object.keys(p.tierLimits ?? {})))
          ).filter((k) => !limitInfo[k]?.isOverage);

          const overageKeys = Array.from(
            new Set(displayPlans.flatMap((p) => Object.keys(p.tierLimits ?? {})))
          ).filter((k) => limitInfo[k]?.isOverage);

          // ── Boolean features (✓ / —) ─────────────────────────────────────
          const planFeatureSets = displayPlans.map(
            (p) => new Set(
              (p.features ?? [])
                .filter((f) => f.isIncluded && !internal.has(f.featureCode))
                .map((f) => f.featureCode)
            )
          );
          const visibleFeatureCodes = comparisonFeatures.filter(
            (code) => featureInfo[code] && planFeatureSets.some((s) => s.has(code))
          );

          // Group feature codes by category (preserving comparisonFeatures order: service_tag then sort_order)
          const featureCategories: string[] = [];
          const featuresByCategory: Record<string, string[]> = {};
          for (const code of visibleFeatureCodes) {
            const cat = featureInfo[code]?.category ?? 'Other';
            if (!featuresByCategory[cat]) {
              featuresByCategory[cat] = [];
              featureCategories.push(cat);
            }
            featuresByCategory[cat].push(code);
          }

          const ColCount = displayPlans.length + 1;

          const SectionHeader = ({ title }: { title: string }) => (
            <tr className="bg-muted/30 border-t border-border">
              <td colSpan={ColCount} className="py-2 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {title}
              </td>
            </tr>
          );

          return (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-foreground mb-4">Plan Comparison</h2>
              <Card className="rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground w-1/2">Feature</th>
                        {displayPlans.map((p) => (
                          <th key={p.id} className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
                            {planTierLabel(p.planCode, activeGroup)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* ── Usage limits ──────────────────────────────────────────── */}
                      {allLimitKeys.length > 0 && (
                        <>
                          <SectionHeader title="Usage Limits" />
                          {allLimitKeys.map((key) => {
                            const info = limitInfo[key];
                            const label = info
                              ? `${info.label}${info.unit ? ` (${info.unit})` : ''}`
                              : key.replace(/_/g, ' ');
                            return (
                              <tr key={key} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-6">
                                  <span className="text-sm font-medium text-foreground">{label}</span>
                                </td>
                                {displayPlans.map((p) => {
                                  const val = (p.tierLimits ?? {})[key];
                                  return (
                                    <td key={p.id} className="py-3 px-4 text-center">
                                      {val === undefined
                                        ? <span className="text-muted-foreground/30 text-sm">—</span>
                                        : val === -1
                                        ? <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">Unlimited</span>
                                        : <span className="text-sm font-semibold text-foreground">{Number(val).toLocaleString()}</span>
                                      }
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </>
                      )}

                      {/* ── Boolean features by category (✓ / —) ─────────────────── */}
                      {featureCategories.flatMap((cat) =>
                        [
                          <SectionHeader key={`hdr-${cat}`} title={cat} />,
                          ...featuresByCategory[cat].map((code) => (
                            <tr key={code} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-6">
                                <span className="text-sm font-medium text-foreground">
                                  {featureInfo[code]?.label ?? code}
                                </span>
                              </td>
                              {planFeatureSets.map((featureSet, pi) => (
                                <td key={displayPlans[pi].id} className="py-3 px-4 text-center">
                                  {featureSet.has(code)
                                    ? <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">✓</span>
                                    : <span className="text-muted-foreground/25 text-base">—</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          )),
                        ]
                      )}

                      {/* ── Overage / per-unit rates ──────────────────────────────── */}
                      {overageKeys.length > 0 && (
                        <>
                          <SectionHeader title="Overage & Usage Rates" />
                          {overageKeys.map((key) => {
                            const info = limitInfo[key];
                            return (
                              <tr key={key} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-6">
                                  <span className="text-sm font-medium text-foreground">
                                    {info?.label ?? key.replace(/_/g, ' ')}
                                  </span>
                                  {info?.unit && (
                                    <span className="text-xs text-muted-foreground ml-1">({info.unit})</span>
                                  )}
                                </td>
                                {displayPlans.map((p) => {
                                  const val = (p.tierLimits ?? {})[key];
                                  return (
                                    <td key={p.id} className="py-3 px-4 text-center">
                                      {val !== undefined
                                        ? <span className="text-sm font-semibold text-foreground">KES {Number(val).toLocaleString()}</span>
                                        : <span className="text-muted-foreground/30 text-sm">—</span>
                                      }
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })()}

        {/* Setup-fee waiver CTA — replaces the retired annual-plan-rows CTA */}
        {billingTab !== 'ONE_TIME' && (
          <Card className="rounded-2xl border border-border mb-12 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Pay Up Front &amp; Save</span>
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-3">6+ months waives your setup fee</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Choose a 6-month or 12-month billing period at checkout and the one-time
                    setup/installation fee is waived entirely. Monthly billing remains available
                    on every plan — cancel anytime.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                  <p className="text-sm font-semibold text-muted-foreground mb-4">Overage & usage rates</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Exceeding your plan limits? You&apos;ll only be charged for what you actually use beyond your package at competitive per-unit rates.
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">Contact support for enterprise pricing.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Root export: gate on role ────────────────────────────────────────────────

function PlansContent() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  return isPlatformOwner ? <AdminPlansView /> : <TenantPlansView />;
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PlansContent />
    </Suspense>
  );
}
