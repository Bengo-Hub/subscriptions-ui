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
import { useAuthStore } from '@/store/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

interface TenantSubscription {
  id: string;
  tenantId?: string;
  tenantSlug: string;
  tenantName: string;
  planName: string;
  planTier: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  monthlyRevenue: number;
  currency: string;
  dunningAttempt?: number;
}

interface PaginatedResponse {
  data: TenantSubscription[];
  total: number;
  page: number;
  pageSize: number;
}

interface EditForm {
  current_period_end: string;
  trial_ends_at: string;
  status: string;
  plan_code: string;
}

const STATUS_OPTIONS = ['ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'SUSPENDED'];

function toLocalDatetime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  // datetime-local needs YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

export default function PlatformSubscriptionsPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<TenantSubscription | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ current_period_end: '', trial_ends_at: '', status: '', plan_code: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['platform-subscriptions', page, search, statusFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse>('/api/v1/admin/subscriptions', {
        page,
        pageSize: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!isPlatformOwner,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, any> }) =>
      apiClient.put(`/api/v1/admin/subscriptions/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      toast.success('Subscription updated');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update subscription'),
  });

  const openEdit = (sub: TenantSubscription) => {
    setEditing(sub);
    setEditForm({
      current_period_end: toLocalDatetime(sub.currentPeriodEnd),
      trial_ends_at: toLocalDatetime(sub.trialEndsAt),
      status: sub.status.toUpperCase(),
      plan_code: '',
    });
  };

  const handleUpdate = () => {
    if (!editing) return;
    const body: Record<string, any> = {};
    if (editForm.current_period_end) body.current_period_end = new Date(editForm.current_period_end).toISOString();
    if (editForm.trial_ends_at) body.trial_ends_at = new Date(editForm.trial_ends_at).toISOString();
    if (editForm.trial_ends_at === '') body.trial_ends_at = ''; // clear
    if (editForm.status && editForm.status !== editing.status.toUpperCase()) body.status = editForm.status;
    if (editForm.plan_code.trim()) body.plan_code = editForm.plan_code.trim().toUpperCase();
    if (Object.keys(body).length === 0) { toast.error('No changes to save'); return; }
    updateMutation.mutate({ id: editing.id, body });
  };

  const statusVariant = (s: string) => {
    const l = s.toLowerCase();
    if (l === 'active') return 'success' as const;
    if (l === 'trialing' || l === 'trial') return 'default' as const;
    if (l === 'past_due' || l === 'suspended') return 'warning' as const;
    if (l === 'canceled' || l === 'cancelled' || l === 'expired') return 'error' as const;
    return 'outline' as const;
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const formatKes = (amount?: number) =>
    amount != null ? `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}` : '—';

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Subscriptions</h1>
        <p className="text-muted-foreground mt-1">View and manage subscriptions across all tenants.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tenants..."
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tenant Subscriptions</h2>
            </div>
            {data && <span className="text-sm text-muted-foreground">{data.total} total</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.data?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Dunning</TableHead>
                    <TableHead className="w-16 text-right pr-6">{''}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {sub.tenantId ? (
                          <Link href={`/platform/tenants/${sub.tenantId}`} className="hover:underline">
                            <p className="font-medium">{sub.tenantName}</p>
                            <p className="text-xs text-muted-foreground">{sub.tenantSlug}</p>
                          </Link>
                        ) : (
                          <div>
                            <p className="font-medium">{sub.tenantName}</p>
                            <p className="text-xs text-muted-foreground">{sub.tenantSlug}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{sub.planName}</TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">{sub.planTier}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(sub.startDate)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatDate(sub.currentPeriodEnd)}</TableCell>
                      <TableCell className="font-semibold text-sm tabular-nums">
                        {formatKes(sub.monthlyRevenue)}/mo
                      </TableCell>
                      <TableCell>
                        {(sub.status === 'SUSPENDED' || sub.status === 'past_due') && sub.dunningAttempt != null ? (
                          <span className={`text-xs font-semibold ${sub.dunningAttempt >= 3 ? 'text-destructive' : 'text-amber-500'}`}>
                            {sub.dunningAttempt >= 3 ? 'Final' : `${sub.dunningAttempt}/3`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(sub)}
                          className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                          title="Edit subscription"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search ? 'No subscriptions match your search.' : 'No subscriptions found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit subscription modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-2xl shadow-2xl border-primary/20">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">Edit Subscription</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground">{editing.tenantName}</span>
                    {' · '}{editing.planName}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(null)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Period end date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Period End Date (expiry / renewal)
                </label>
                <Input
                  type="datetime-local"
                  value={editForm.current_period_end}
                  onChange={(e) => setEditForm((f) => ({ ...f, current_period_end: e.target.value }))}
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Current: {formatDate(editing.currentPeriodEnd)}</p>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Trial ends at */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Trial Ends At <span className="text-muted-foreground/50 normal-case font-normal">(leave blank to keep, clear to remove)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={editForm.trial_ends_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, trial_ends_at: e.target.value }))}
                    className="h-11 rounded-xl flex-1"
                  />
                  {editForm.trial_ends_at && (
                    <Button variant="ghost" size="icon" onClick={() => setEditForm((f) => ({ ...f, trial_ends_at: '' }))} className="h-11 w-11 rounded-xl shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Plan code override */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Switch Plan Code <span className="text-muted-foreground/50 normal-case font-normal">(optional — must be a valid plan code)</span>
                </label>
                <Input
                  value={editForm.plan_code}
                  onChange={(e) => setEditForm((f) => ({ ...f, plan_code: e.target.value.toUpperCase() }))}
                  placeholder={`Current: ${editing.planName}`}
                  className="h-11 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="rounded-xl h-10 px-6 font-semibold"
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
