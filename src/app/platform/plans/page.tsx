'use client';

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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Loader2, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

type ServiceTab = 'All' | 'Ordering' | 'POS' | 'Inventory' | 'ERP' | 'Logistics' | 'TruLoad';
const SERVICE_TABS: ServiceTab[] = ['All', 'Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad'];

function planService(code: string): ServiceTab {
  if (/^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(code)) return 'Ordering';
  if (code.startsWith('POS_')) return 'POS';
  if (code.startsWith('INVENTORY_')) return 'Inventory';
  if (code.startsWith('ERP_')) return 'ERP';
  if (code.startsWith('LOGISTICS_')) return 'Logistics';
  if (code.startsWith('TRULOAD_') || code.startsWith('TRANSPORTER_')) return 'TruLoad';
  return 'All';
}

const cycleLabel: Record<string, string> = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-Time' };
const cycleColor: Record<string, string> = {
  MONTHLY: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ANNUAL: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ONE_TIME: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const emptyForm: Partial<Plan> = {
  name: '', planCode: '', description: '',
  basePrice: 0, billingCycle: 'MONTHLY', currency: 'KES',
  isActive: true, tierOrder: 1, tierLimits: {},
};

type TierLimitEntry = { key: string; value: string };

function tierLimitsToEntries(limits: Record<string, any>): TierLimitEntry[] {
  return Object.entries(limits).map(([key, value]) => ({ key, value: String(value) }));
}
function entriesToTierLimits(entries: TierLimitEntry[]): Record<string, any> {
  return Object.fromEntries(
    entries
      .filter((e) => e.key.trim())
      .map(({ key, value }) => {
        const num = Number(value);
        return [key.trim(), isNaN(num) ? value : num];
      })
  );
}

export default function PlatformPlansPage() {
  const qc = useQueryClient();
  const [serviceTab, setServiceTab] = useState<ServiceTab>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>(emptyForm);
  const [tierEntries, setTierEntries] = useState<TierLimitEntry[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => apiClient.get<{ plans: Plan[] }>('/api/v1/plans').then((r) => r.plans),
  });

  const plans = (data ?? []).filter(
    (p) => serviceTab === 'All' || planService(p.planCode) === serviceTab
  );

  const createMutation = useMutation({
    mutationFn: (body: Partial<Plan>) => apiClient.post('/api/v1/admin/plans', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-plans'] }); toast.success('Plan created'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create plan'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Plan> }) => apiClient.put(`/api/v1/admin/plans/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-plans'] }); toast.success('Plan updated'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update plan'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-plans'] }); toast.success('Plan deleted'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete plan'),
  });

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setTierEntries([]);
    setShowForm(true);
  };
  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setForm({ ...p });
    setTierEntries(tierLimitsToEntries(p.tierLimits ?? {}));
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingPlan(null); };

  const handleSubmit = () => {
    const payload = { ...form, tierLimits: entriesToTierLimits(tierEntries) };
    if (editingPlan) updateMutation.mutate({ id: editingPlan.id, body: payload });
    else createMutation.mutate(payload);
  };

  const addTierEntry = () => setTierEntries((prev) => [...prev, { key: '', value: '' }]);
  const updateTierEntry = (i: number, field: 'key' | 'value', val: string) =>
    setTierEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  const removeTierEntry = (i: number) => setTierEntries((prev) => prev.filter((_, idx) => idx !== i));

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
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
        {SERVICE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setServiceTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-semibold transition-all',
              serviceTab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingPlan ? `Edit — ${editingPlan.name}` : 'New Plan'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Core fields */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan Code</label>
                <Input
                  value={form.planCode}
                  onChange={(e) => setForm((p) => ({ ...p, planCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. LOGISTICS_STARTER"
                  className="h-11 rounded-xl font-mono"
                  disabled={!!editingPlan}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price (KES)</label>
                <Input type="number" value={form.basePrice} onChange={(e) => setForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Billing Cycle</label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value as Plan['billingCycle'] }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
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

            {/* Tier Limits — dynamic key-value editor */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tier Limits</label>
                <Button variant="outline" size="sm" onClick={addTierEntry} className="h-8 rounded-lg text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Limit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use <code className="bg-accent px-1 rounded">-1</code> for unlimited. Numbers are stored as numbers, text as strings.</p>
              {tierEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No limits configured — plan has no usage gates.</p>
              ) : (
                <div className="space-y-2">
                  {tierEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="limit key (e.g. max_riders)"
                        value={entry.key}
                        onChange={(e) => updateTierEntry(i, 'key', e.target.value)}
                        className="h-9 rounded-lg font-mono text-xs flex-1"
                      />
                      <Input
                        placeholder="value (e.g. 5 or -1)"
                        value={entry.value}
                        onChange={(e) => updateTierEntry(i, 'value', e.target.value)}
                        className="h-9 rounded-lg font-mono text-xs w-36"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeTierEntry(i)} className="h-9 w-9 rounded-lg hover:text-destructive shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              <h2 className="font-semibold">
                {serviceTab === 'All' ? 'All Plans' : `${serviceTab} Plans`}
              </h2>
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
                      <TableCell>
                        <code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{p.planCode}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                          {planService(p.planCode)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {p.basePrice.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', cycleColor[p.billingCycle])}>
                          {cycleLabel[p.billingCycle]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {Object.keys(p.tierLimits ?? {}).length} limits
                      </TableCell>
                      <TableCell>
                        <div className={cn('w-2 h-2 rounded-full inline-block', p.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                        <span className="ml-1.5 text-xs text-muted-foreground">{p.isActive ? 'Live' : 'Hidden'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No plans found{serviceTab !== 'All' ? ` for ${serviceTab}` : ''}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
