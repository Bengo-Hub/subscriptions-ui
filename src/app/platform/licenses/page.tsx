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
import { useAdminCreatePlan, useAdminDeletePlan, useAdminUpdatePlan } from '@/hooks/usePlans';
import type { Plan, PlanCreateRequest, PlanUpdateRequest } from '@/types/plan';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, Pencil, Plus, Search, Send, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planCode?: string;
}

type ServiceTab = 'All' | 'Ordering' | 'POS' | 'Inventory' | 'ERP' | 'Logistics' | 'TruLoad';
const SERVICE_TABS: ServiceTab[] = ['All', 'Ordering', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad'];

function planService(code: string): ServiceTab {
  if (code.startsWith('POS_')) return 'POS';
  if (code.startsWith('INVENTORY_')) return 'Inventory';
  if (code.startsWith('ERP_')) return 'ERP';
  if (code.startsWith('LOGISTICS_')) return 'Logistics';
  if (code.startsWith('TRULOAD_') || code.startsWith('TRANSPORTER_')) return 'TruLoad';
  if (/^(STARTER|GROWTH|PROFESSIONAL)/.test(code)) return 'Ordering';
  return 'All';
}

function isLicensePlan(p: Plan): boolean {
  return (
    p.billingCycle === 'ONE_TIME' ||
    p.planCode.includes('LICENSE') ||
    p.planCode.includes('ONE_TIME') ||
    p.planCode.includes('_COMPLETE') ||
    p.planCode.includes('AI_CREDITS')
  );
}

const emptyCreateForm: PlanCreateRequest = {
  planCode: '',
  name: '',
  description: '',
  billingCycle: 'ONE_TIME',
  basePrice: 0,
  isActive: false,
  isPublic: false,
  serviceTag: '',
  freeTrialDays: 0,
};

export default function LicensesPage() {
  const qc = useQueryClient();
  const [serviceTab, setServiceTab] = useState<ServiceTab>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<PlanCreateRequest>(emptyCreateForm);
  const [editForm, setEditForm] = useState<PlanUpdateRequest>({});
  const [assignModal, setAssignModal] = useState<{ plan: Plan } | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  const { data: plansData } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () =>
      apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans', { limit: 500 }).then((r) => r.data ?? []),
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['platform-tenants', tenantSearch],
    queryFn: () =>
      apiClient.get<{ data: Tenant[]; total: number }>('/api/v1/admin/tenants', {
        search: tenantSearch || undefined,
      }),
    enabled: !!assignModal,
  });

  const createMutation = useAdminCreatePlan();
  const updateMutation = useAdminUpdatePlan();
  const deleteMutation = useAdminDeletePlan();

  const assignMutation = useMutation({
    mutationFn: ({ tenantId, planCode }: { tenantId: string; planCode: string }) =>
      apiClient.post(`/api/v1/admin/tenants/${tenantId}/subscription`, { planCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      qc.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      toast.success('License assigned successfully');
      setAssignModal(null);
      setSelectedTenantId('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to assign license'),
  });

  const licensePlans = (plansData ?? [])
    .filter(isLicensePlan)
    .filter((p) => serviceTab === 'All' || planService(p.planCode) === serviceTab);

  const tenants = (tenantsData?.data ?? []).filter(
    (t) => !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase()) || t.slug.includes(tenantSearch)
  );

  const openCreate = () => { setEditingId(null); setCreateForm(emptyCreateForm); setShowForm(true); };
  const openEdit = (p: Plan) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description, basePrice: p.basePrice, isActive: p.isActive, isPublic: p.isPublic, freeTrialDays: p.freeTrialDays });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, req: editForm }, { onSuccess: closeForm });
    } else {
      const payload = { ...createForm, planCode: createForm.planCode.toUpperCase().trim() };
      createMutation.mutate(payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = (p: Plan) => {
    if (!confirm(`Delete license plan "${p.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(p.id);
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One-time and perpetual license plans. Assign directly to tenants for permanent access.
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> New License Plan
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
              serviceTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingId ? 'Edit License Plan' : 'New License Plan'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {editingId ? (
              /* Edit form — only mutable fields */
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                    <Input value={editForm.name ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Price (KES)</label>
                    <Input type="number" min={0} value={editForm.basePrice ?? 0} onChange={(e) => setEditForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                  <Input value={editForm.description ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={editForm.isActive ?? false} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={editForm.isPublic ?? false} onChange={(e) => setEditForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Public (visible to tenants)</span>
                  </label>
                </div>
              </>
            ) : (
              /* Create form — all fields */
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan Code</label>
                    <Input
                      value={createForm.planCode}
                      onChange={(e) => setCreateForm((p) => ({ ...p, planCode: e.target.value.toUpperCase() }))}
                      placeholder="e.g. POS_LICENSE_BASIC"
                      className="h-11 rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                    <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. POS Basic License" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Price (KES)</label>
                    <Input type="number" min={0} value={createForm.basePrice} onChange={(e) => setCreateForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service Tag</label>
                    <select value={createForm.serviceTag ?? ''} onChange={(e) => setCreateForm((p) => ({ ...p, serviceTag: e.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium">
                      <option value="">All services</option>
                      <option value="ordering">Ordering</option>
                      <option value="pos">POS</option>
                      <option value="inventory">Inventory</option>
                      <option value="erp">ERP</option>
                      <option value="logistics">Logistics</option>
                      <option value="truload">TruLoad</option>
                      <option value="marketflow">MarketFlow</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                    <Input value={createForm.description ?? ''} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description" className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={createForm.isActive ?? false} onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={createForm.isPublic ?? false} onChange={(e) => setCreateForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium">Public (visible to tenants)</span>
                  </label>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={busy || (!editingId && (!createForm.planCode || !createForm.name))}
                className="rounded-xl h-10 px-6 font-semibold"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* License plans table */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">{serviceTab === 'All' ? 'All License Plans' : `${serviceTab} Licenses`}</h2>
            </div>
            <span className="text-sm text-muted-foreground">{licensePlans.length} plan{licensePlans.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {licensePlans.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    {['Plan', 'Code', 'Service', 'Price (KES)', 'Limits', 'Status', 'Actions'].map((h) => (
                      <TableHead key={h} className={cn('py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground', h === 'Actions' && 'text-right pr-6')}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licensePlans.map((p) => (
                    <TableRow key={p.id} className="border-border/50 hover:bg-accent/50">
                      <TableCell className="py-4 pl-6">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-56">{p.description}</div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{p.planCode}</code></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                          {planService(p.planCode)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">{p.basePrice.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{Object.keys(p.tierLimits ?? {}).length} limits</TableCell>
                      <TableCell>
                        <div className={cn('w-2 h-2 rounded-full inline-block', p.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                        <span className="ml-1.5 text-xs text-muted-foreground">{p.isActive ? 'Active' : 'Inactive'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setAssignModal({ plan: p }); setSelectedTenantId(''); setTenantSearch(''); }}
                            className="h-8 rounded-lg text-xs font-semibold"
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Assign
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                            className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                            title="Edit plan"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(p)}
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleteMutation.isPending}
                            title="Delete plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No license plans found{serviceTab !== 'All' ? ` for ${serviceTab}` : ''}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-2xl shadow-2xl border-primary/20">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Assign License</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Assigning <span className="font-semibold text-foreground">{assignModal.plan.name}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAssignModal(null)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-xl bg-accent/50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan code</span>
                  <code className="font-mono text-xs">{assignModal.plan.planCode}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">KES {assignModal.plan.basePrice.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search tenant</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} placeholder="Type tenant name or slug..." className="pl-9 h-11 rounded-xl" />
                </div>
              </div>
              {tenantsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : tenants.length ? (
                <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-border p-1">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTenantId(t.id)}
                      className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors', selectedTenantId === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{t.name}</div>
                        <div className={cn('text-xs', selectedTenantId === t.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{t.slug}</div>
                      </div>
                      {t.planCode && (
                        <Badge variant="outline" className={cn('text-[10px] ml-2', selectedTenantId === t.id && 'border-primary-foreground/30 text-primary-foreground')}>
                          {t.planCode}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">No tenants found.</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setAssignModal(null)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => assignMutation.mutate({ tenantId: selectedTenantId, planCode: assignModal.plan.planCode })}
                  disabled={!selectedTenantId || assignMutation.isPending}
                  className="rounded-xl h-10 px-6 font-semibold"
                >
                  {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Assign License
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
