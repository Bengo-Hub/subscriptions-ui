'use client';

import { useMemo, useState } from 'react';
import { Edit, Loader2, Package, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { Badge, Button, Input } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageContainer, PageHeader, SectionCard } from '@/components/ui/page-header';
import { CapsuleTabs } from '@/components/ui/tabs';
import { CatalogFeaturePicker, serviceTagLabel, type FeatureEntry, type TierLimitEntry } from '@/components/plans/CatalogFeaturePicker';
import { useAllPlans } from '@/hooks/usePlans';
import { apiClient } from '@/lib/api/client';
import { listFeatureCatalog } from '@/lib/api/feature-catalog';
import { cn } from '@/lib/utils';
import { cycleLabel, groupLabel, planGroup, sortGroups, type DiscountRule, type Plan, type PlanFeature } from '@/lib/plans/catalog';

const emptyForm: Partial<Plan> = {
  name: '', planCode: '', description: '', basePrice: 0, billingCycle: 'MONTHLY', currency: 'KES', isActive: true, isPublic: true,
  tierOrder: 1, tierLimits: {}, planType: 'TIERED', serviceTag: '', freeTrialDays: 14, discountRules: [],
};

// Service tags as stored on plans and in the feature catalog (service_tag column).
const SERVICE_TAGS = ['ordering', 'pos', 'inventory', 'treasury', 'logistics', 'erp', 'marketflow', 'truload', 'transporter_portal', 'isp_billing', 'projects', 'platform'] as const;
const PLAN_TYPES = ['TIERED', 'STANDALONE_SERVICE', 'BUNDLE', 'CUSTOM'] as const;

const cycleColor: Record<string, string> = {
  MONTHLY: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  ANNUAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ONE_TIME: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

const toLimitEntries = (limits: Record<string, any>): TierLimitEntry[] => Object.entries(limits).map(([k, v]) => ({ key: k, value: String(v) }));
const fromLimitEntries = (entries: TierLimitEntry[]) =>
  Object.fromEntries(
    entries
      .filter((e) => e.key.trim())
      .map(({ key, value }) => {
        const n = Number(value);
        return [key.trim(), isNaN(n) ? value : n];
      }),
  );
const toFeatureEntries = (features: PlanFeature[] = []): FeatureEntry[] =>
  features.map((f) => ({
    featureCode: f.featureCode,
    isIncluded: f.isIncluded,
    limitValue: f.limitValue != null ? String(f.limitValue) : '',
    overageUnitPrice: String(f.overageUnitPrice ?? 0),
  }));
const toFeaturePayload = (entries: FeatureEntry[]): PlanFeature[] =>
  entries
    .filter((e) => e.featureCode.trim())
    .map((e) => ({
      featureCode: e.featureCode.trim(),
      isIncluded: e.isIncluded,
      limitValue: e.limitValue !== '' ? Number(e.limitValue) : null,
      overageUnitPrice: Number(e.overageUnitPrice) || 0,
    }));

const fieldLabel = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground';
const selectClass = 'flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium';

/** Platform owners: create, edit and delete plans across every service group. */
export function AdminPlansView() {
  const qc = useQueryClient();
  const [serviceTab, setServiceTab] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>(emptyForm);
  const [tierEntries, setTierEntries] = useState<TierLimitEntry[]>([]);
  const [featureEntries, setFeatureEntries] = useState<FeatureEntry[]>([]);
  const [catalogService, setCatalogService] = useState<string>('all');
  const [deleting, setDeleting] = useState<Plan | null>(null);

  const { data, isLoading } = useAllPlans();
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: () => listFeatureCatalog().then((r) => r.features ?? []),
    staleTime: 5 * 60 * 1000,
  });
  const catalog = catalogData ?? [];

  // Tabs come from the groups actually present (never hard-coded).
  const adminTabs = useMemo(
    () => ['All', ...sortGroups([...new Set((data ?? []).map((p) => planGroup(p.planCode)))])].map((g) => ({ key: g, label: groupLabel(g) })),
    [data],
  );
  const plans = useMemo(
    () =>
      (data ?? [])
        .filter((p) => serviceTab === 'All' || planGroup(p.planCode) === serviceTab)
        .sort((a, b) => a.tierOrder - b.tierOrder || (a.planCode ?? '').localeCompare(b.planCode ?? '')),
    [data, serviceTab],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['plans'] });
  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };
  const createMutation = useMutation({
    mutationFn: (body: Partial<Plan>) => apiClient.post('/api/v1/admin/plans', body),
    onSuccess: () => {
      refresh();
      toast.success('Plan created');
      closeForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create plan'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Plan> }) => apiClient.put(`/api/v1/admin/plans/${id}`, body),
    onSuccess: () => {
      refresh();
      toast.success('Plan updated');
      closeForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update plan'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/plans/${id}`),
    onSuccess: () => {
      refresh();
      toast.success('Plan deleted');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete plan'),
  });

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setTierEntries([]);
    setFeatureEntries([]);
    setCatalogService('all');
    setShowForm(true);
  };

  // Fetch the plan by id (bypasses the list cache) so trial days and overage prices are current
  // even right after an update. Bundle plans span services, so the picker opens on "All".
  const openEdit = async (p: Plan) => {
    setEditingPlan(p);
    setShowForm(true);
    setCatalogService('all');
    let planData: Plan = p;
    try {
      const fresh = await apiClient.get<{ plan: Plan } | Plan>(`/api/v1/plans/${p.id}`);
      planData = (fresh as any)?.plan ?? (fresh as Plan);
    } catch {
      // fall back to the list row
    }
    setForm({ ...planData, isPublic: planData.isPublic ?? true, discountRules: planData.discountRules ?? [] });
    setTierEntries(toLimitEntries(planData.tierLimits ?? {}));
    setFeatureEntries(toFeatureEntries(planData.features));
  };

  const handleSubmit = () => {
    const payload = { ...form, tierLimits: fromLimitEntries(tierEntries), features: toFeaturePayload(featureEntries) };
    if (editingPlan) updateMutation.mutate({ id: editingPlan.id, body: payload });
    else createMutation.mutate(payload);
  };
  const busy = createMutation.isPending || updateMutation.isPending;

  const updateDiscount = (i: number, patch: Partial<DiscountRule>) =>
    setForm((p) => ({ ...p, discountRules: (p.discountRules ?? []).map((en, idx) => (idx === i ? { ...en, ...patch } : en)) }));

  const columns: DataTableColumn<Plan>[] = [
    {
      key: 'name',
      header: 'Plan',
      primary: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{p.name}</div>
          <div className="max-w-56 truncate text-xs text-muted-foreground">{p.description}</div>
        </div>
      ),
    },
    { key: 'code', header: 'Code', hideBelow: 'lg', render: (p) => <code className="rounded bg-accent px-2 py-0.5 font-mono text-xs">{p.planCode ?? '—'}</code> },
    { key: 'group', header: 'Service', hideBelow: 'md', render: (p) => <Badge variant="outline">{groupLabel(planGroup(p.planCode))}</Badge> },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'xl',
      render: (p) => (
        <span className="text-xs text-muted-foreground">
          {(p.planType ?? 'TIERED').replace('_', ' ').toLowerCase()}
          {p.billingCycle === 'ONE_TIME' && <span className="ml-1 font-bold text-purple-700 dark:text-purple-400">· perpetual</span>}
        </span>
      ),
    },
    { key: 'price', header: 'Price (KES)', align: 'right', accessor: (p) => p.basePrice, render: (p) => <span className="font-semibold tabular-nums">{(p.basePrice ?? 0).toLocaleString()}</span> },
    {
      key: 'cycle',
      header: 'Cycle',
      hideBelow: 'md',
      render: (p) => <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', cycleColor[p.billingCycle])}>{cycleLabel[p.billingCycle]}</span>,
    },
    { key: 'limits', header: 'Limits', hideBelow: 'xl', render: (p) => <span className="text-xs text-muted-foreground">{Object.keys(p.tierLimits ?? {}).length} limits</span> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('inline-block h-2 w-2 rounded-full', p.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30')} aria-hidden />
          {p.isActive ? 'Live' : 'Hidden'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} className="hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Platform"
        icon={Sparkles}
        title="Plans"
        description="Create and manage subscription plans across all service groups."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden /> New plan
          </Button>
        }
      />

      <CapsuleTabs items={adminTabs} value={serviceTab} onChange={setServiceTab} label="Service groups" idPrefix="admin-plans" className="w-fit max-w-full" />

      {showForm && (
        <SectionCard
          title={editingPlan ? `Edit ${editingPlan.name}` : 'New plan'}
          icon={editingPlan ? Edit : Plus}
          action={
            <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close the plan form">
              <X className="h-4 w-4" />
            </Button>
          }
          className="border-primary/20 shadow-lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label htmlFor="pf-name" className={fieldLabel}>Display name</label>
                <Input id="pf-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-code" className={fieldLabel}>Plan code</label>
                <Input id="pf-code" value={form.planCode} onChange={(e) => setForm((p) => ({ ...p, planCode: e.target.value.toUpperCase() }))} placeholder="e.g. LOGISTICS_STARTER" className="h-11 rounded-xl font-mono" disabled={!!editingPlan} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-price" className={fieldLabel}>Price (KES)</label>
                <Input id="pf-price" type="number" value={form.basePrice} onChange={(e) => setForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-cycle" className={fieldLabel}>Billing cycle</label>
                <select id="pf-cycle" value={form.billingCycle} onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value as Plan['billingCycle'] }))} className={selectClass}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="ONE_TIME">One-time</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-type" className={fieldLabel}>Plan type</label>
                <select id="pf-type" value={form.planType ?? 'TIERED'} onChange={(e) => setForm((p) => ({ ...p, planType: e.target.value as Plan['planType'] }))} className={selectClass}>
                  {PLAN_TYPES.map((t) => (
                    <option key={t} value={t}>{serviceTagLabel(t.toLowerCase())}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pf-service" className={fieldLabel}>Service</label>
                <select
                  id="pf-service"
                  value={form.serviceTag ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, serviceTag: v }));
                    if (v) setCatalogService(v);
                  }}
                  className={selectClass}
                >
                  <option value="">Bundle / platform-wide</option>
                  {SERVICE_TAGS.map((t) => (
                    <option key={t} value={t}>{serviceTagLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="pf-desc" className={fieldLabel}>Description</label>
                <Input id="pf-desc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short plan summary…" className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                <span className="text-sm font-medium">Active</span>
              </label>
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input type="checkbox" checked={form.isPublic ?? true} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                <span className="text-sm font-medium">Public</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Tier order
                <Input type="number" value={form.tierOrder} onChange={(e) => setForm((p) => ({ ...p, tierOrder: Number(e.target.value) }))} className="h-9 w-20 rounded-lg text-center" />
              </label>
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input type="checkbox" checked={(form.freeTrialDays ?? 14) > 0} onChange={(e) => setForm((p) => ({ ...p, freeTrialDays: e.target.checked ? 14 : 0 }))} className="h-4 w-4 rounded accent-primary" />
                <span className="text-sm font-medium">Free trial</span>
              </label>
              {(form.freeTrialDays ?? 14) > 0 && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Input type="number" min={1} max={365} value={form.freeTrialDays ?? 14} onChange={(e) => setForm((p) => ({ ...p, freeTrialDays: Number(e.target.value) }))} className="h-9 w-20 rounded-lg text-center" />
                  days
                </label>
              )}
            </div>

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

            <EditorBlock
              title="Tier limits"
              hint={<>Use <code className="rounded bg-accent px-1">-1</code> for unlimited.</>}
              addLabel="Add limit"
              onAdd={() => setTierEntries((p) => [...p, { key: '', value: '' }])}
              empty={tierEntries.length === 0 ? 'No limits configured.' : undefined}
            >
              {tierEntries.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input aria-label="Limit key" placeholder="key (e.g. max_riders)" value={entry.key} onChange={(e) => setTierEntries((p) => p.map((en, idx) => (idx === i ? { ...en, key: e.target.value } : en)))} className="h-9 min-w-48 flex-1 rounded-lg font-mono text-xs" />
                  <Input aria-label="Limit value" placeholder="value (e.g. 5 or -1)" value={entry.value} onChange={(e) => setTierEntries((p) => p.map((en, idx) => (idx === i ? { ...en, value: e.target.value } : en)))} className="h-9 w-full rounded-lg font-mono text-xs sm:w-36" />
                  <RemoveRow label="Remove limit" onClick={() => setTierEntries((p) => p.filter((_, idx) => idx !== i))} />
                </div>
              ))}
            </EditorBlock>

            <EditorBlock
              title="Features and overage pricing"
              hint="Overage price per unit above the limit (0 = not billable)."
              addLabel="Add feature"
              onAdd={() => setFeatureEntries((p) => [...p, { featureCode: '', isIncluded: true, limitValue: '', overageUnitPrice: '0' }])}
              empty={featureEntries.length === 0 ? 'No features configured.' : undefined}
            >
              {featureEntries.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input aria-label="Feature code" placeholder="feature_code (e.g. rider_app)" value={f.featureCode} onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => (idx === i ? { ...en, featureCode: e.target.value } : en)))} className="h-9 min-w-48 flex-1 rounded-lg font-mono text-xs" />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <input type="checkbox" checked={f.isIncluded} onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => (idx === i ? { ...en, isIncluded: e.target.checked } : en)))} className="h-3.5 w-3.5 rounded accent-primary" />
                    Included
                  </label>
                  <Input aria-label="Limit value (blank = none)" type="number" placeholder="limit" value={f.limitValue} onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => (idx === i ? { ...en, limitValue: e.target.value } : en)))} className="h-9 w-24 rounded-lg font-mono text-xs" />
                  <Input aria-label="Overage unit price (KES)" type="number" placeholder="overage KES" value={f.overageUnitPrice} onChange={(e) => setFeatureEntries((p) => p.map((en, idx) => (idx === i ? { ...en, overageUnitPrice: e.target.value } : en)))} className="h-9 w-28 rounded-lg font-mono text-xs" />
                  <RemoveRow label="Remove feature" onClick={() => setFeatureEntries((p) => p.filter((_, idx) => idx !== i))} />
                </div>
              ))}
            </EditorBlock>

            <EditorBlock
              title="Discount rules"
              addLabel="Add discount"
              onAdd={() => setForm((p) => ({ ...p, discountRules: [...(p.discountRules ?? []), { type: 'YEARLY', percentage: 0 }] }))}
              empty={(form.discountRules ?? []).length === 0 ? 'No discount rules.' : undefined}
            >
              {(form.discountRules ?? []).map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Discount type" value={d.type} onChange={(e) => updateDiscount(i, { type: e.target.value as DiscountRule['type'] })} className="h-9 min-w-40 flex-1 rounded-lg border border-input bg-transparent px-2 text-xs font-medium">
                    <option value="YEARLY">Annual</option>
                    <option value="LOYALTY">Loyalty</option>
                    <option value="NEW_CUSTOMER">New customer</option>
                  </select>
                  <Input aria-label="Percentage off" type="number" placeholder="% off" value={d.percentage} onChange={(e) => updateDiscount(i, { percentage: Number(e.target.value) })} className="h-9 w-28 rounded-lg font-mono text-xs" />
                  <RemoveRow label="Remove discount" onClick={() => setForm((p) => ({ ...p, discountRules: (p.discountRules ?? []).filter((_, idx) => idx !== i) }))} />
                </div>
              ))}
            </EditorBlock>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                {editingPlan ? 'Update plan' : 'Create plan'}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={serviceTab === 'All' ? 'All plans' : `${groupLabel(serviceTab)} plans`}
        icon={Package}
        action={<span className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>}
        bodyClassName="p-0 sm:p-0"
      >
        <DataTable<Plan> columns={columns} rows={plans} rowKey={(p) => p.id} loading={isLoading} emptyText="No plans found." gridLines="rows" maxBodyHeight={false} />
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'this plan'}?`}
        description="This cannot be undone. Check no tenant is on it first; to stop new sign-ups only, untick Public or Active instead."
        confirmLabel="Delete plan"
        pending={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </PageContainer>
  );
}

function EditorBlock({
  title,
  hint,
  addLabel,
  onAdd,
  empty,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  addLabel: string;
  onAdd: () => void;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={fieldLabel}>{title}</p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3" aria-hidden /> {addLabel}
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {empty ? <p className="text-sm italic text-muted-foreground">{empty}</p> : children}
    </div>
  );
}

function RemoveRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} className="shrink-0 hover:text-destructive">
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
