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
import { Building2, Loader2, RefreshCw, Search, Shield, UserX, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus?: string;
  planCode?: string;
  planName?: string;
  subscriptionId?: string;
}

interface Plan {
  id: string;
  planCode: string;
  name: string;
  billingCycle: string;
  basePrice: number;
}

type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string }> = {
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  TRIAL:     { label: 'Trial',     color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  SUSPENDED: { label: 'Suspended', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-500' },
  EXPIRED:   { label: 'Expired',   color: 'bg-muted text-muted-foreground' },
};

type ModalType = 'assign' | 'status';

interface ModalState {
  type: ModalType;
  tenant: Tenant;
  selectedPlanCode?: string;
  selectedStatus?: SubscriptionStatus;
}

export default function TenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [planSearch, setPlanSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform-tenants', page, search, statusFilter],
    queryFn: () =>
      apiClient.get<{ data: Tenant[]; total: number }>('/api/v1/admin/tenants', {
        page,
        pageSize: 25,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['platform-plans-all'],
    queryFn: () =>
      apiClient.get<{ data: Plan[]; total: number }>('/api/v1/plans', { limit: 500 }).then((r) => r.data ?? []),
    enabled: modal?.type === 'assign',
  });

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const filteredPlans = (plansData ?? []).filter((p) =>
    !planSearch ||
    p.planCode.toLowerCase().includes(planSearch.toLowerCase()) ||
    p.name.toLowerCase().includes(planSearch.toLowerCase())
  );

  const assignMutation = useMutation({
    mutationFn: ({ tenantId, planCode }: { tenantId: string; planCode: string }) =>
      apiClient.post(`/api/v1/admin/tenants/${tenantId}/subscription`, { planCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      qc.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      toast.success('Plan assigned successfully');
      setModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to assign plan'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ subId, status }: { subId: string; status: string }) =>
      apiClient.put(`/api/v1/admin/subscriptions/${subId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Subscription status updated');
      setModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update status'),
  });

  const openAssign = (t: Tenant) => { setModal({ type: 'assign', tenant: t, selectedPlanCode: t.planCode }); setPlanSearch(''); };
  const openStatus = (t: Tenant) => setModal({ type: 'status', tenant: t, selectedStatus: (t.subscriptionStatus as SubscriptionStatus) ?? 'ACTIVE' });

  const handleAssign = () => {
    if (!modal?.selectedPlanCode) return;
    assignMutation.mutate({ tenantId: modal.tenant.id, planCode: modal.selectedPlanCode });
  };

  const handleStatus = () => {
    if (!modal?.selectedStatus || !modal.tenant.subscriptionId) return;
    statusMutation.mutate({ subId: modal.tenant.subscriptionId, status: modal.selectedStatus });
  };

  const busy = assignMutation.isPending || statusMutation.isPending;

  const statusBadge = (status?: string) => {
    const s = (status?.toUpperCase() ?? 'UNKNOWN') as SubscriptionStatus;
    const cfg = STATUS_CONFIG[s];
    if (!cfg) return <Badge variant="outline" className="text-[10px]">{status ?? 'None'}</Badge>;
    return <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tenant subscriptions — assign plans, update status, and view account health.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 rounded-xl gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or slug..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-10 rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">All Tenants</h2>
            </div>
            <span className="text-sm text-muted-foreground">{total} tenant{total !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : tenants.length ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      {['Tenant', 'Plan', 'Status', 'Actions'].map((h) => (
                        <TableHead key={h} className={cn('py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground', h === 'Actions' && 'text-right pr-6')}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id} className="border-border/50 hover:bg-accent/50">
                        <TableCell className="py-4 pl-6">
                          <div className="font-semibold text-foreground">{t.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{t.slug}</div>
                        </TableCell>
                        <TableCell>
                          {t.planName ? (
                            <div>
                              <div className="text-sm font-medium">{t.planName}</div>
                              <code className="text-[10px] text-muted-foreground font-mono">{t.planCode}</code>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No plan assigned</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(t.subscriptionStatus)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => openAssign(t)}
                              className="h-8 rounded-lg text-xs font-semibold gap-1.5"
                            >
                              <Zap className="h-3.5 w-3.5" /> Assign Plan
                            </Button>
                            {t.subscriptionId && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => openStatus(t)}
                                className="h-8 rounded-lg text-xs font-semibold gap-1.5"
                              >
                                <Shield className="h-3.5 w-3.5" /> Status
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg">Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg">Next</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {search ? 'No tenants match your search.' : 'No tenants found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Plan Modal */}
      {modal?.type === 'assign' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-2xl shadow-2xl border-primary/20">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Assign Plan</h2>
                  <p className="text-sm text-muted-foreground">
                    Tenant: <span className="font-semibold text-foreground">{modal.tenant.name}</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setModal(null)} className="rounded-full h-8 w-8 p-0">✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {modal.tenant.planName && (
                <div className="rounded-xl bg-accent/50 px-4 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Current plan</span>
                  <span className="font-semibold">{modal.tenant.planName}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  placeholder="Search plans..."
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border border-border p-1">
                {filteredPlans.length ? filteredPlans.map((p) => (
                  <button
                    key={p.planCode}
                    onClick={() => setModal((m) => m ? { ...m, selectedPlanCode: p.planCode } : m)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors',
                      modal.selectedPlanCode === p.planCode ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    )}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{p.name}</div>
                      <code className={cn('text-[10px] font-mono', modal.selectedPlanCode === p.planCode ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {p.planCode}
                      </code>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-semibold tabular-nums">KES {p.basePrice.toLocaleString()}</div>
                      <div className={cn('text-[10px]', modal.selectedPlanCode === p.planCode ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {p.billingCycle}
                      </div>
                    </div>
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No plans found.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setModal(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAssign} disabled={!modal.selectedPlanCode || busy} className="rounded-xl h-10 px-6 font-semibold">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Assign Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Status Modal */}
      {modal?.type === 'status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm rounded-2xl shadow-2xl border-primary/20">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Update Status</h2>
                  <p className="text-sm text-muted-foreground">{modal.tenant.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setModal(null)} className="rounded-full h-8 w-8 p-0">✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Current status: {statusBadge(modal.tenant.subscriptionStatus)}
              </p>
              <div className="space-y-2">
                {(Object.entries(STATUS_CONFIG) as [SubscriptionStatus, { label: string; color: string }][]).map(([v, { label, color }]) => (
                  <button
                    key={v}
                    onClick={() => setModal((m) => m ? { ...m, selectedStatus: v } : m)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      modal.selectedStatus === v ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-accent/50'
                    )}
                  >
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', color)}>{label}</span>
                    {v === 'ACTIVE' && <span className="text-muted-foreground text-xs">— Tenant has full access</span>}
                    {v === 'SUSPENDED' && <span className="text-muted-foreground text-xs">— Access blocked, data retained</span>}
                    {v === 'CANCELLED' && <span className="text-muted-foreground text-xs">— Subscription terminated</span>}
                    {v === 'TRIAL' && <span className="text-muted-foreground text-xs">— In trial period</span>}
                    {v === 'EXPIRED' && <span className="text-muted-foreground text-xs">— Renewal overdue</span>}
                  </button>
                ))}
              </div>
              {modal.selectedStatus === 'CANCELLED' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
                  <UserX className="h-4 w-4 shrink-0" />
                  This will terminate the subscription. The tenant will lose access immediately.
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setModal(null)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={handleStatus}
                  disabled={modal.selectedStatus === modal.tenant.subscriptionStatus || busy}
                  className={cn('rounded-xl h-10 px-6 font-semibold', modal.selectedStatus === 'CANCELLED' && 'bg-destructive hover:bg-destructive/90')}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  Apply Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
