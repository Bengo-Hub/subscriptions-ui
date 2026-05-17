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
import { Check, Edit, Layout, Loader2, Package, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// ─── Shared types ────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  basePrice: number;
  currency: string;
  isActive: boolean;
  tierOrder: number;
  tierLimits: Record<string, any>;
}

interface CurrentSubscription {
  id: string;
  planId: string;
  planCode: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
}

type ServiceTab = 'All' | 'Ordering' | 'POS' | 'Inventory' | 'ERP' | 'Logistics' | 'TruLoad';
type BillingTab = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';

const SERVICE_TABS_ALL: ServiceTab[] = ['All', 'Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad'];
const SERVICE_TABS_TENANT: ServiceTab[] = ['Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad'];

function planService(code: string): ServiceTab {
  if (/^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(code)) return 'Ordering';
  if (code.startsWith('POS_')) return 'POS';
  if (code.startsWith('INVENTORY_')) return 'Inventory';
  if (code.startsWith('ERP_')) return 'ERP';
  if (code.startsWith('LOGISTICS_')) return 'Logistics';
  if (code.startsWith('TRULOAD_') || code.startsWith('TRANSPORTER_')) return 'TruLoad';
  return 'All';
}

function stripServicePrefix(planCode: string, service: ServiceTab): string {
  let stripped = planCode;
  switch (service) {
    case 'Ordering': stripped = planCode.replace(/_YEARLY$/, ''); break;
    case 'POS': stripped = planCode.replace(/^POS_/, ''); break;
    case 'Inventory': stripped = planCode.replace(/^INVENTORY_/, ''); break;
    case 'ERP': stripped = planCode.replace(/^ERP_/, ''); break;
    case 'Logistics': stripped = planCode.replace(/^LOGISTICS_/, ''); break;
    case 'TruLoad': stripped = planCode.replace(/^TRULOAD_/, '').replace(/^TRANSPORTER_/, '').replace(/_YEARLY$/, ''); break;
  }
  return stripped.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function isOneTimePlan(p: Plan) { return p.billingCycle === 'ONE_TIME' || p.planCode.includes('ONE_TIME') || p.planCode.includes('LICENSE') || p.planCode.includes('_COMPLETE'); }
function isAnnualPlan(p: Plan) { return p.billingCycle === 'ANNUAL' || p.planCode.includes('YEARLY'); }
function isRecommended(code: string) { const u = code.toUpperCase(); return u.includes('GROWTH') || u.includes('STANDARD') || u.includes('DEVICE_5'); }

const cycleLabel: Record<string, string> = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-Time' };
const cycleColor: Record<string, string> = {
  MONTHLY: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ANNUAL: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ONE_TIME: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

// ─── Admin (platform owner) view ─────────────────────────────────────────────

const emptyForm: Partial<Plan> = { name: '', planCode: '', description: '', basePrice: 0, billingCycle: 'MONTHLY', currency: 'KES', isActive: true, tierOrder: 1, tierLimits: {} };
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
    queryFn: () => apiClient.get<{ plans: Plan[] }>('/api/v1/plans').then((r) => r.plans),
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
  const openEdit = (p: Plan) => { setEditingPlan(p); setForm({ ...p }); setTierEntries(toLimitEntries(p.tierLimits ?? {})); setShowForm(true); };
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
              <div className="flex items-end gap-6 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium">Active (visible to tenants)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Tier Order</label>
                  <Input type="number" value={form.tierOrder} onChange={(e) => setForm((p) => ({ ...p, tierOrder: Number(e.target.value) }))} className="h-9 w-20 rounded-lg text-center" />
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
                  {plans.sort((a, b) => a.tierOrder - b.tierOrder || a.planCode.localeCompare(b.planCode)).map((p) => (
                    <TableRow key={p.id} className="border-border/50 hover:bg-accent/50">
                      <TableCell className="py-4 pl-6">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-50">{p.description}</div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{p.planCode}</code></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">{planService(p.planCode)}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">{p.basePrice.toLocaleString()}</TableCell>
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
  const [activeService, setActiveService] = useState<ServiceTab>('Ordering');
  const [billingTab, setBillingTab] = useState<BillingTab>('MONTHLY');

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<{ plans: Plan[]; count: number }>('/api/v1/plans'),
    staleTime: 300_000,
  });

  const allPlans: Plan[] = plansResponse?.plans ?? [];
  const servicePlans = allPlans.filter((p) => planService(p.planCode) === activeService || (activeService !== 'All' && planService(p.planCode) === activeService));
  const hasOneTime = servicePlans.some((p) => isOneTimePlan(p));
  const displayPlans = servicePlans
    .filter((p) => { if (billingTab === 'ONE_TIME') return isOneTimePlan(p); if (billingTab === 'ANNUAL') return isAnnualPlan(p) && !isOneTimePlan(p); return !isAnnualPlan(p) && !isOneTimePlan(p); })
    .sort((a, b) => a.tierOrder - b.tierOrder);
  const isAnnual = billingTab === 'ANNUAL';

  const getTierClass = (code: string) => {
    const u = code.toUpperCase();
    if (u.includes('PROFESSIONAL') || u.includes('PREMIUM') || u.includes('COMPLETE')) return 'from-purple-500/20 to-transparent';
    if (u.includes('GROWTH') || u.includes('STANDARD') || u.includes('DEVICE_5') || u.includes('DEVICE_10')) return 'from-primary/20 to-transparent';
    return 'from-blue-500/10 to-transparent';
  };
  const getTierBorder = (code: string, isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-blue-500 border-blue-500 shadow-xl shadow-blue-500/10';
    const u = code.toUpperCase();
    if (u.includes('GROWTH') || u.includes('STANDARD') || u.includes('DEVICE_5')) return 'border-primary shadow-lg shadow-primary/5';
    return 'border-border';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6">
            <Sparkles className="h-4 w-4" /> Choose your plan
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6">
            Choose the membership <br />
            <span className="bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">that's right for you</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprise chains, we provide the tools you need to grow your business.
          </p>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Service tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-accent border border-border flex-wrap justify-center">
            {SERVICE_TABS_TENANT.map((tab) => (
              <button key={tab} onClick={() => { setActiveService(tab); setBillingTab('MONTHLY'); }}
                className={cn('px-5 py-2.5 rounded-xl text-sm font-black transition-all', activeService === tab ? 'bg-white dark:bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-accent border border-border">
            {(['MONTHLY', 'ANNUAL'] as BillingTab[]).concat(hasOneTime ? ['ONE_TIME'] : []).map((tab) => (
              <button key={tab} onClick={() => setBillingTab(tab)}
                className={cn('px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2', billingTab === tab ? 'bg-white dark:bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {tab === 'MONTHLY' ? 'Monthly' : tab === 'ANNUAL' ? (<>Annual <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-black">SAVE 17%</span></>) : 'One-Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        {plansLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : displayPlans.length === 0 ? (
          <div className="text-center py-20"><p className="text-muted-foreground">No plans available for this selection.</p></div>
        ) : (
          <div className={cn('grid gap-8 mb-20', displayPlans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : displayPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-3')}>
            {displayPlans.map((plan) => {
              const isCurrent = currentSub?.planCode === plan.planCode;
              const recommended = isRecommended(plan.planCode) && !isCurrent;
              const displayName = stripServicePrefix(plan.planCode, activeService);
              return (
                <div key={plan.id} className="relative">
                  <Card className={cn('h-full flex flex-col rounded-[3rem] p-4 transition-all duration-300 bg-card border', getTierBorder(plan.planCode, isCurrent))}>
                    {recommended && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">Recommended</div>}
                    {isCurrent && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">Current Plan</div>}
                    <div className={cn('rounded-[2.5rem] p-8 h-full flex flex-col bg-linear-to-b', getTierClass(plan.planCode))}>
                      <div className="mb-8">
                        <h3 className="text-2xl font-black text-foreground mb-2">{displayName}</h3>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-5xl font-black text-foreground">
                            {billingTab === 'ONE_TIME' ? `KES ${plan.basePrice.toLocaleString()}` : `KES ${isAnnual ? Math.round(plan.basePrice / 12).toLocaleString() : plan.basePrice.toLocaleString()}`}
                          </span>
                          {billingTab !== 'ONE_TIME' && <span className="text-muted-foreground font-bold">/mo</span>}
                        </div>
                        {isAnnual && <p className="text-xs text-muted-foreground font-bold -mt-2 mb-2">Billed KES {plan.basePrice.toLocaleString()} / year</p>}
                        {billingTab === 'ONE_TIME' && <p className="text-xs text-muted-foreground font-bold -mt-2 mb-2">One-time payment</p>}
                        <p className="text-muted-foreground font-medium text-sm leading-relaxed min-h-16">{plan.description}</p>
                      </div>
                      <div className="flex-1 space-y-4 mb-10">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-2">Top Features</p>
                        <div className="space-y-3">
                          {Object.entries(plan.tierLimits ?? {}).slice(0, 4).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3">
                              <Check className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="text-sm font-semibold text-foreground capitalize">{val === -1 ? 'Unlimited' : String(val)} {key.replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant={recommended ? 'primary' : 'outline'}
                        className={cn('w-full h-14 rounded-2xl font-black text-lg transition-all', isCurrent && 'opacity-50 cursor-default', recommended && 'shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90', !recommended && 'border-border text-foreground hover:bg-accent')}
                        disabled={isCurrent}
                        onClick={() => {
                          if (isCurrent) return;
                          if (!currentSub) { router.push(`/subscribe?plan=${plan.planCode}`); return; }
                          const cur = allPlans.find((p) => p.planCode === currentSub.planCode);
                          if (!cur) { router.push(`/subscribe?plan=${plan.planCode}`); return; }
                          router.push(plan.tierOrder > cur.tierOrder ? `/upgrade?plan=${plan.planCode}` : `/downgrade?plan=${plan.planCode}`);
                        }}
                      >
                        {isCurrent ? 'Current Plan' : (() => {
                          if (!currentSub) return 'Get Started';
                          const cur = allPlans.find((p) => p.planCode === currentSub.planCode);
                          if (!cur) return 'Get Started';
                          return plan.tierOrder > cur.tierOrder ? 'Upgrade' : 'Downgrade';
                        })()}
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature comparison table */}
        {!plansLoading && displayPlans.length > 0 && (
          <div className="mt-16 mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-foreground mb-4">Plan Features Comparison</h2>
              <p className="text-muted-foreground">Detailed limits for each plan in this category.</p>
            </div>
            <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-6 px-10 text-xs font-black uppercase tracking-widest text-muted-foreground">Feature</th>
                      {displayPlans.map((p) => (
                        <th key={p.id} className="py-6 px-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">{stripServicePrefix(p.planCode, activeService)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(displayPlans.flatMap((p) => Object.keys(p.tierLimits ?? {})))).map((limitKey, idx, arr) => (
                      <tr key={limitKey} className={cn('group transition-colors', idx !== arr.length - 1 && 'border-b border-border/50')}>
                        <td className="py-5 px-10"><span className="text-sm font-bold text-foreground capitalize group-hover:text-blue-500 transition-colors">{limitKey.replace(/_/g, ' ')}</span></td>
                        {displayPlans.map((p) => {
                          const val = (p.tierLimits ?? {})[limitKey];
                          return <td key={p.id} className="py-5 px-6 text-center"><span className="text-sm font-black text-foreground">{val === undefined ? '—' : val === -1 ? 'Unlimited' : String(val)}</span></td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Annual savings banner */}
        <div className="mt-12 p-12 rounded-[3.5rem] bg-card border border-border relative overflow-hidden dark:bg-accent/50">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-black text-white mb-6">Simple, Transparent Pricing</h3>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">Exceeding your plan's limits? You'll be charged at competitive rates only for what you use beyond your package.</p>
              <p className="text-sm text-muted-foreground font-medium">Overage rates vary by plan — contact support for details.</p>
            </div>
            <div className="p-10 rounded-[3rem] bg-linear-to-br from-white/10 to-transparent border border-white/10 text-center relative">
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-green-500 text-white border-none font-black text-[10px] tracking-widest px-3">SAVE BIG</Badge>
              </div>
              <Layout className="h-16 w-16 text-blue-500 mx-auto mb-6" />
              <h4 className="text-3xl font-black text-white mb-3">Annual Savings</h4>
              <p className="text-muted-foreground text-md mb-8">Switch to annual billing and get <span className="text-white font-black underline underline-offset-4 decoration-primary">1 month for free</span> on any plan.</p>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black h-16 rounded-2xl text-xl shadow-2xl" onClick={() => setBillingTab('ANNUAL')}>Switch to Annual</Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
        </div>
      </div>
    </div>
  );
}

// ─── Root export: gate on role ────────────────────────────────────────────────

export default function PlansPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  return isPlatformOwner ? <AdminPlansView /> : <TenantPlansView />;
}
