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
import { BadgePercent, Edit, Loader2, Plus, Save, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Backend returns snake_case from Ent ORM — match exactly
interface ServiceChargePlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  charge_type: 'PERCENTAGE' | 'FIXED_PER_TRANSACTION' | 'TIERED';
  charge_value: number;
  currency: string;
  min_charge?: number | null;
  max_charge?: number | null;
  applicable_services?: string[] | null;
  is_active: boolean;
  is_default: boolean;
}

// Shape used for the create/update form (camelCase for ergonomics)
interface ServiceChargePlanForm {
  code: string;
  name: string;
  description: string;
  chargeType: 'PERCENTAGE' | 'FIXED_PER_TRANSACTION' | 'TIERED';
  chargeValue: number;
  currency: string;
  minCharge: number | null;
  maxCharge: number | null;
  applicableServices: string[];
  isActive: boolean;
  isDefault: boolean;
}

const CHARGE_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_PER_TRANSACTION', label: 'Fixed per transaction' },
  { value: 'TIERED', label: 'Tiered (volume-based)' },
];

const SERVICE_GROUPS = [
  { key: 'ordering', label: 'Ordering' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'treasury', label: 'Treasury' },
  { key: 'pos', label: 'POS' },
  { key: 'truload', label: 'TruLoad' },
];

const emptyForm: ServiceChargePlanForm = {
  code: '', name: '', description: '',
  chargeType: 'PERCENTAGE', chargeValue: 0,
  currency: 'KES', minCharge: null, maxCharge: null,
  applicableServices: [], isActive: true, isDefault: false,
};

function chargeDisplay(p: ServiceChargePlan): string {
  if (p.charge_type === 'PERCENTAGE') return `${p.charge_value}%`;
  if (p.charge_type === 'FIXED_PER_TRANSACTION') return `KES ${p.charge_value}`;
  return 'Tiered';
}

function planToForm(p: ServiceChargePlan): ServiceChargePlanForm {
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? '',
    chargeType: p.charge_type,
    chargeValue: p.charge_value,
    currency: p.currency,
    minCharge: p.min_charge ?? null,
    maxCharge: p.max_charge ?? null,
    applicableServices: p.applicable_services ?? [],
    isActive: p.is_active,
    isDefault: p.is_default,
  };
}

export default function ServiceChargesPage() {
  const qc = useQueryClient();
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceChargePlanForm>(emptyForm);
  const [svcInput, setSvcInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['platform-service-charges'],
    queryFn: () =>
      apiClient.get<{ data: ServiceChargePlan[]; total: number }>('/api/v1/service-charges/plans'),
  });

  const allPlans = data?.data ?? [];
  const plans = allPlans.filter((p) => {
    if (serviceFilter === 'all') return true;
    const svcs = p.applicable_services ?? [];
    if (svcs.length === 0) return true;
    return svcs.includes(serviceFilter);
  });

  const createMutation = useMutation({
    mutationFn: (body: ServiceChargePlanForm) =>
      apiClient.post('/api/v1/admin/service-charges', {
        code: body.code,
        name: body.name,
        description: body.description,
        chargeType: body.chargeType,
        chargeValue: body.chargeValue,
        currency: body.currency,
        minCharge: body.minCharge,
        maxCharge: body.maxCharge,
        applicableServices: body.applicableServices,
        isActive: body.isActive,
        isDefault: body.isDefault,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-service-charges'] }); toast.success('Service charge created'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServiceChargePlanForm }) =>
      apiClient.put(`/api/v1/admin/service-charges/${id}`, {
        name: body.name,
        description: body.description,
        chargeType: body.chargeType,
        chargeValue: body.chargeValue,
        currency: body.currency,
        minCharge: body.minCharge,
        maxCharge: body.maxCharge,
        applicableServices: body.applicableServices,
        isActive: body.isActive,
        isDefault: body.isDefault,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-service-charges'] }); toast.success('Service charge updated'); closeForm(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/service-charges/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-service-charges'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete'),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setSvcInput(''); setShowForm(true); };
  const openEdit = (p: ServiceChargePlan) => {
    setEditingId(p.id);
    const f = planToForm(p);
    setForm(f);
    setSvcInput(f.applicableServices.join(', '));
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = () => {
    const services = svcInput.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = { ...form, applicableServices: services };
    if (editingId) updateMutation.mutate({ id: editingId, body: payload });
    else createMutation.mutate(payload);
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Charges</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure commission rates and transaction fees per service.</p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> New Charge Plan
        </Button>
      </div>

      {/* Service filter */}
      <div className="flex gap-1 p-1 bg-accent/50 rounded-2xl w-fit flex-wrap">
        {[{ key: 'all', label: 'All' }, ...SERVICE_GROUPS].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setServiceFilter(key)}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-semibold transition-all',
              serviceFilter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingId ? `Edit — ${form.name}` : 'New Service Charge Plan'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan Code</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SC_ORDERING_5PCT"
                  className="h-11 rounded-xl font-mono"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ordering 5% Service Charge" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Charge Type</label>
                <select
                  value={form.chargeType}
                  onChange={(e) => setForm((p) => ({ ...p, chargeType: e.target.value as ServiceChargePlanForm['chargeType'] }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
                  {CHARGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {form.chargeType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount (KES)'}
                </label>
                <Input type="number" step="0.01" value={form.chargeValue} onChange={(e) => setForm((p) => ({ ...p, chargeValue: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min Charge (KES, optional)</label>
                <Input type="number" value={form.minCharge ?? ''} onChange={(e) => setForm((p) => ({ ...p, minCharge: e.target.value ? Number(e.target.value) : null }))} placeholder="none" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max Charge (KES, optional)</label>
                <Input type="number" value={form.maxCharge ?? ''} onChange={(e) => setForm((p) => ({ ...p, maxCharge: e.target.value ? Number(e.target.value) : null }))} placeholder="none" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Applicable Services (comma-separated)</label>
              <Input
                value={svcInput}
                onChange={(e) => setSvcInput(e.target.value)}
                placeholder="ordering, logistics  — leave blank for all services"
                className="h-11 rounded-xl font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Product codes: ordering, logistics, treasury, pos, inventory, erp, truload. Empty = applies to all.</p>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium">Default for applicable services</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy} className="rounded-xl h-10 px-6 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgePercent className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Charge Plans</h2>
            </div>
            <span className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : plans.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    {['Plan', 'Code', 'Type', 'Rate', 'Min / Max', 'Services', 'Status', ''].map((h) => (
                      <TableHead key={h} className={cn('py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground', h === '' && 'text-right pr-6')}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.id} className="border-border/50 hover:bg-accent/50">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.name}</span>
                          {p.is_default && <span title="Default"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /></span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{p.code}</code></TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">{CHARGE_TYPES.find((t) => t.value === p.charge_type)?.label}</TableCell>
                      <TableCell className="font-semibold tabular-nums">{chargeDisplay(p)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {p.min_charge != null ? `${p.min_charge}` : '—'} / {p.max_charge != null ? `${p.max_charge}` : '—'}
                      </TableCell>
                      <TableCell>
                        {(p.applicable_services ?? []).length === 0 ? (
                          <Badge variant="outline" className="text-[10px]">All</Badge>
                        ) : (
                          <div className="flex gap-1 flex-wrap">
                            {(p.applicable_services ?? []).map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px] capitalize">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={cn('w-2 h-2 rounded-full inline-block', p.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                        <span className="ml-1.5 text-xs text-muted-foreground">{p.is_active ? 'Active' : 'Inactive'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline" size="icon"
                            onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                            className="h-8 w-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
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
              No service charge plans found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
