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
import { useAuthStore } from '@/store/auth';
import { useCoupons, useCreateCoupon, useDeleteCoupon, useUpdateCoupon } from '@/hooks/useCoupons';
import { usePlans } from '@/hooks/usePlans';
import type { Coupon, CouponCreateRequest, CouponType } from '@/types/coupon';
import { Loader2, Percent, Plus, Tag, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const emptyForm: CouponCreateRequest = {
  code: '',
  name: '',
  type: 'percentage',
  value: 0,
  isActive: false,
  maxUses: -1,
  maxStacks: 1,
  minPlanPrice: 0,
  applicablePlanCodes: [],
};

function typeLabel(t: CouponType) {
  return { percentage: '% Off', fixed_kes: 'KES Off', free_months: 'Free Months' }[t];
}

function formatValue(c: Coupon) {
  if (c.type === 'percentage') return `${c.value}%`;
  if (c.type === 'fixed_kes') return `KES ${c.value.toLocaleString()}`;
  return `${c.value} month${c.value !== 1 ? 's' : ''}`;
}

export default function CouponsPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponCreateRequest>(emptyForm);

  const { data, isLoading } = useCoupons(activeFilter !== undefined ? { active: activeFilter } : undefined);
  const { data: plansData } = usePlans();
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  const plans = plansData ?? [];
  const coupons = data?.data ?? [];

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description,
      type: c.type,
      value: c.value,
      applicablePlanCodes: c.applicablePlanCodes,
      minPlanPrice: c.minPlanPrice,
      maxUses: c.maxUses,
      maxStacks: c.maxStacks,
      isActive: c.isActive,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = () => {
    const payload = { ...form, code: form.code.toUpperCase().trim() };
    if (editingId) {
      updateMutation.mutate({ id: editingId, req: payload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload, { onSuccess: closeForm });
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupon Codes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage discount coupon codes for tenants.</p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> New Coupon
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {([undefined, true, false] as const).map((v) => (
          <Button
            key={String(v)}
            variant={activeFilter === v ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(v)}
          >
            {v === undefined ? 'All' : v ? 'Active' : 'Inactive'}
          </Button>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Code</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. WELCOME20"
                  className="h-11 rounded-xl font-mono"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Welcome 20% Off" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                <Input value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CouponType }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
                  <option value="percentage">% Off</option>
                  <option value="fixed_kes">KES Off</option>
                  <option value="free_months">Free Months</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Value {form.type === 'percentage' ? '(%)' : form.type === 'fixed_kes' ? '(KES)' : '(months)'}
                </label>
                <Input type="number" min={0} value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max Uses (−1 = unlimited)</label>
                <Input type="number" min={-1} value={form.maxUses ?? -1} onChange={(e) => setForm((p) => ({ ...p, maxUses: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max Stacks</label>
                <Input type="number" min={1} value={form.maxStacks ?? 1} onChange={(e) => setForm((p) => ({ ...p, maxStacks: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valid From (RFC3339)</label>
                <Input type="datetime-local" value={form.validFrom ? form.validFrom.slice(0, 16) : ''} onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valid Until (optional)</label>
                <Input type="datetime-local" value={form.validUntil ? form.validUntil.slice(0, 16) : ''} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min Plan Price (KES)</label>
                <Input type="number" min={0} value={form.minPlanPrice ?? 0} onChange={(e) => setForm((p) => ({ ...p, minPlanPrice: Number(e.target.value) }))} className="h-11 rounded-xl" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            {plans.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Applicable Plans (leave empty = all plans)</label>
                <div className="flex flex-wrap gap-2">
                  {plans.map((p) => {
                    const selected = (form.applicablePlanCodes ?? []).includes(p.planCode);
                    return (
                      <button
                        key={p.planCode}
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          applicablePlanCodes: selected
                            ? (prev.applicablePlanCodes ?? []).filter((c) => c !== p.planCode)
                            : [...(prev.applicablePlanCodes ?? []), p.planCode],
                        }))}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground hover:border-primary'}`}
                      >
                        {p.planCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy || !form.code || !form.name} className="rounded-xl h-10 px-6 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupons table */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Coupon Codes</h2>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} total</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : coupons.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right pr-6">{''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono font-bold">{c.code}</code></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-semibold">{typeLabel(c.type)}</Badge></TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatValue(c)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      {c.maxUses === -1 ? `${c.usedCount} / ∞` : `${c.usedCount} / ${c.maxUses}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">From</span>
                          <span>{c.validFrom ? new Date(c.validFrom).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Until</span>
                          <span>{c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '∞'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'outline'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateMutation.mutate({ id: c.id, req: { isActive: !c.isActive } })}
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          {c.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500">
                          <Percent className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm(`Deactivate coupon "${c.code}"?`)) deleteMutation.mutate(c.id); }}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">No coupons found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
