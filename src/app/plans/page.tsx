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
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

// ─── Shared types ────────────────────────────────────────────────────────────

interface DiscountRule {
  type: 'ANNUAL_DISCOUNT' | 'LOYALTY_DISCOUNT' | 'NEW_CUSTOMER';
  value: number;
  description?: string;
}

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  basePrice: number;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  tierOrder: number;
  tierLimits: Record<string, any>;
  freeTrialDays: number;
  discountRules: DiscountRule[];
}

interface CurrentSubscription {
  id: string;
  plan_code: string;   // snake_case from SubscriptionResult
  plan_name: string;
  status: string;      // uppercase: ACTIVE, TRIAL, EXPIRED, CANCELLED
  trial_ends_at: string | null;
  current_period_end: string;
}

type ServiceTab = 'All' | 'Ordering' | 'POS' | 'Inventory' | 'ERP' | 'Logistics' | 'TruLoad' | 'MarketFlow';
type BillingTab = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';

const SERVICE_TABS_ALL: ServiceTab[] = ['All', 'Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad', 'MarketFlow'];
const SERVICE_TABS_TENANT: ServiceTab[] = ['Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad', 'MarketFlow'];

function planService(code: string | null | undefined): ServiceTab {
  if (!code) return 'All';
  if (code.startsWith('ORDERING_') || /^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(code)) return 'Ordering';
  if (code.startsWith('POS_')) return 'POS';
  if (code.startsWith('INVENTORY_')) return 'Inventory';
  if (code.startsWith('ERP_')) return 'ERP';
  if (code.startsWith('LOGISTICS_')) return 'Logistics';
  if (code.startsWith('TRULOAD_') || code.startsWith('TRANSPORTER_')) return 'TruLoad';
  if (code.startsWith('MARKETFLOW_')) return 'MarketFlow';
  return 'All';
}

function stripServicePrefix(planCode: string | null | undefined, service: ServiceTab): string {
  if (!planCode) return '—';
  let stripped = planCode;
  switch (service) {
    case 'Ordering': stripped = planCode.replace(/_YEARLY$/, ''); break;
    case 'POS': stripped = planCode.replace(/^POS_/, ''); break;
    case 'Inventory': stripped = planCode.replace(/^INVENTORY_/, ''); break;
    case 'ERP': stripped = planCode.replace(/^ERP_/, ''); break;
    case 'Logistics': stripped = planCode.replace(/^LOGISTICS_/, ''); break;
    case 'TruLoad': stripped = planCode.replace(/^TRULOAD_/, '').replace(/^TRANSPORTER_/, '').replace(/_YEARLY$/, ''); break;
    case 'MarketFlow': stripped = planCode.replace(/^MARKETFLOW_/, '').replace(/_YEARLY$/, ''); break;
  }
  return stripped.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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

// ─── Admin (platform owner) view ─────────────────────────────────────────────

const emptyForm: Partial<Plan> = { name: '', planCode: '', description: '', basePrice: 0, billingCycle: 'MONTHLY', currency: 'KES', isActive: true, isPublic: true, tierOrder: 1, tierLimits: {}, freeTrialDays: 14, discountRules: [] };
type TierLimitEntry = { key: string; value: string };
const toLimitEntries = (limits: Record<string, any>): TierLimitEntry[] => Object.entries(limits).map(([k, v]) => ({ key: k, value: String(v) }));
const fromLimitEntries = (entries: TierLimitEntry[]) => Object.fromEntries(entries.filter((e) => e.key.trim()).map(({ key, value }) => { const n = Number(value); return [key.trim(), isNaN(n) ? value : n]; }));

function AdminPlansView() {
  const qc = useQueryClient();
  const [serviceTab, setServiceTab] = useState<ServiceTab>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>(emptyForm);
  const [tierEntries, setTierEntries] = useState<TierLimitEntry[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['plans-admin'],
    queryFn: () => apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans').then((r) => r.data ?? []),
  });

  const plans = (data ?? []).filter((p) => serviceTab === 'All' || planService(p.planCode) === serviceTab);

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

  const openCreate = () => { setEditingPlan(null); setForm(emptyForm); setTierEntries([]); setShowForm(true); };
  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setForm({ ...p, freeTrialDays: p.freeTrialDays ?? 14, isPublic: p.isPublic ?? true, discountRules: p.discountRules ?? [] });
    setTierEntries(toLimitEntries(p.tierLimits ?? {}));
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingPlan(null); };
  const handleSubmit = () => {
    const payload = { ...form, tierLimits: fromLimitEntries(tierEntries) };
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
        {SERVICE_TABS_ALL.map((t) => (
          <button key={t} onClick={() => setServiceTab(t)}
            className={cn('px-4 py-1.5 rounded-xl text-xs font-semibold transition-all', serviceTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t}
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
                    {['Plan', 'Code', 'Service', 'Price', 'Cycle', 'Limits', 'Status', ''].map((h) => (
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
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">{planService(p.planCode)}</Badge>
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

  const initialService = (): ServiceTab => {
    if (!serviceParam) return 'Ordering';
    const map: Record<string, ServiceTab> = {
      ordering: 'Ordering', pos: 'POS', inventory: 'Inventory',
      erp: 'ERP', logistics: 'Logistics', truload: 'TruLoad', marketflow: 'MarketFlow',
    };
    return map[serviceParam.toLowerCase()] ?? 'Ordering';
  };

  const [activeService, setActiveService] = useState<ServiceTab>(initialService);
  const [billingTab, setBillingTab] = useState<BillingTab>('MONTHLY');
  const highlightPlanCode = planParam ?? null;

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans'),
    staleTime: 300_000,
  });

  const allPlans: Plan[] = plansResponse?.data ?? [];
  const servicePlans = allPlans.filter((p) => planService(p.planCode) === activeService);
  const hasOneTime = servicePlans.some((p) => isOneTimePlan(p));
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
          {SERVICE_TABS_TENANT.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveService(tab); setBillingTab('MONTHLY'); }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                activeService === tab
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 border border-border rounded-xl w-fit mb-8">
          {(['MONTHLY', 'ANNUAL'] as BillingTab[]).concat(hasOneTime ? ['ONE_TIME'] : []).map((tab) => (
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
              {tab === 'MONTHLY' ? 'Monthly' : tab === 'ANNUAL' ? (
                <>Annual <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">SAVE 17%</span></>
              ) : 'One-Time'}
            </button>
          ))}
        </div>

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
              const displayName = stripServicePrefix(plan.planCode, activeService);
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
              } else if (!curSubPlan) {
                btnLabel = 'Subscribe';
                btnAction = () => router.push(`/subscribe?plan=${plan.planCode}`);
              } else if (plan.tierOrder > curSubPlan.tierOrder) {
                btnLabel = 'Upgrade';
                btnAction = () => router.push(`/upgrade?plan=${plan.planCode}`);
              } else {
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
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed min-h-10">{plan.description}</p>
                      </div>

                      {/* Features / limits */}
                      <div className="flex-1 mb-6 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
                          {prevPlan
                            ? `Everything in ${stripServicePrefix(prevPlan.planCode, activeService)}, plus:`
                            : "What's included"}
                        </p>
                        {prevPlan && (
                          <div className="flex items-center gap-2 py-1 opacity-60">
                            <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              All {stripServicePrefix(prevPlan.planCode, activeService)} features
                            </span>
                          </div>
                        )}
                        {limitsToShow.map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2 py-0.5">
                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 text-primary" />
                            </div>
                            <span className="text-sm text-foreground capitalize">
                              <span className="font-semibold">
                                {val === -1 ? 'Unlimited' : String(val)}
                              </span>{' '}
                              {key.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
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

        {/* Feature comparison table */}
        {!plansLoading && displayPlans.length > 1 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4">Plan Comparison</h2>
            <Card className="rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                      {displayPlans.map((p) => (
                        <th key={p.id} className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
                          {stripServicePrefix(p.planCode, activeService)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(displayPlans.flatMap((p) => Object.keys(p.tierLimits ?? {})))).map((limitKey, idx, arr) => (
                      <tr key={limitKey} className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors', idx === arr.length - 1 && 'border-b-0')}>
                        <td className="py-3.5 px-6">
                          <span className="text-sm font-medium text-foreground capitalize">{limitKey.replace(/_/g, ' ')}</span>
                        </td>
                        {displayPlans.map((p) => {
                          const val = (p.tierLimits ?? {})[limitKey];
                          return (
                            <td key={p.id} className="py-3.5 px-4 text-center">
                              <span className="text-sm font-semibold text-foreground">
                                {val === undefined ? <span className="text-muted-foreground/40">—</span> : val === -1 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">Unlimited</span>
                                ) : String(val)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Annual savings CTA */}
        {billingTab !== 'ANNUAL' && billingTab !== 'ONE_TIME' && (
          <Card className="rounded-2xl border border-border mb-12 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Annual Billing</span>
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-3">Save up to 17% annually</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Switch to annual billing and get the equivalent of one month free. Cancel anytime.
                  </p>
                  <Button
                    variant="outline"
                    className="h-11 px-6 rounded-xl font-semibold"
                    onClick={() => setBillingTab('ANNUAL')}
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    View Annual Plans
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
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
