'use client';

import { Badge, Button, Card, CardContent, Input } from '@/components/ui/base';
import { SupportChargesTable } from '@/components/support/SupportChargesTable';
import {
  useCreateSupportAgreement,
  useTenantSupportAgreements,
  useUpdateSupportAgreement,
} from '@/hooks/useSupportAgreements';
import {
  SUPPORT_CYCLE_LABELS,
  supportPeriodLabel,
  type SupportAgreement,
  type SupportAgreementInput,
  type SupportCollection,
  type SupportCycle,
  type SupportIntervalUnit,
  type SupportTiming,
} from '@/lib/api/support';
import { formatCurrency } from '@bengo-hub/shared-ui-lib';
import { AlertTriangle, Headset, Loader2, Pause, Pencil, Play, Plus, Square } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground';

interface FormState {
  name: string;
  billing_cycle: SupportCycle;
  interval_count: string;
  interval_unit: SupportIntervalUnit;
  amount: string;
  billing_timing: SupportTiming;
  starts_at: string;
  ends_at: string;
  notes: string;
  billing_email: string;
  collection: SupportCollection;
  reschedule_from: 'next_period' | 'now';
}

const emptyForm: FormState = {
  name: '',
  billing_cycle: 'MONTHLY',
  interval_count: '2',
  interval_unit: 'MONTH',
  amount: '',
  billing_timing: 'ADVANCE',
  starts_at: '',
  ends_at: '',
  notes: '',
  billing_email: '',
  collection: 'business',
  reschedule_from: 'next_period',
};

function formFrom(a: SupportAgreement): FormState {
  return {
    name: a.name,
    billing_cycle: a.billing_cycle,
    interval_count: String(a.interval_count),
    interval_unit: a.interval_unit,
    amount: a.amount != null ? String(a.amount) : '',
    billing_timing: a.billing_timing,
    starts_at: '',
    ends_at: a.ends_at ? a.ends_at.slice(0, 10) : '',
    notes: a.notes ?? '',
    billing_email: a.billing_email ?? '',
    collection: a.collection ?? 'business',
    reschedule_from: 'next_period',
  };
}

/** Builds the request body; on edit only changed fields are sent. */
function toInput(f: FormState, original?: SupportAgreement): SupportAgreementInput | string {
  const input: SupportAgreementInput = {};
  const name = f.name.trim();
  if (!original || name !== original.name) input.name = name;

  const custom = f.billing_cycle === 'CUSTOM';
  const count = Number(f.interval_count);
  if (custom && (!Number.isInteger(count) || count < 1)) return 'Enter a whole number for the custom period';
  const cadenceChanged =
    !original ||
    f.billing_cycle !== original.billing_cycle ||
    (custom && (count !== original.interval_count || f.interval_unit !== original.interval_unit));
  if (cadenceChanged) {
    input.billing_cycle = f.billing_cycle;
    if (custom) {
      input.interval_count = count;
      input.interval_unit = f.interval_unit;
    }
  }
  if (!original || f.billing_timing !== original.billing_timing) input.billing_timing = f.billing_timing;

  if (f.amount.trim()) {
    const amount = Number(f.amount);
    if (Number.isNaN(amount) || amount < 0) return 'Amount must be a non-negative number';
    if (!original || amount !== original.amount) input.amount = amount;
  } else if (original?.amount != null) {
    input.clear_amount = true;
  }

  if (!original && f.starts_at) input.starts_at = new Date(f.starts_at).toISOString();
  if (f.ends_at) {
    const ends = new Date(f.ends_at).toISOString();
    if (!original || ends.slice(0, 10) !== original.ends_at?.slice(0, 10)) input.ends_at = ends;
  } else if (original?.ends_at) {
    input.clear_ends_at = true;
  }
  if (!original || f.notes !== (original.notes ?? '')) input.notes = f.notes;
  if (!original || f.billing_email.trim() !== (original.billing_email ?? '')) input.billing_email = f.billing_email.trim();
  if (!original || f.collection !== (original.collection ?? 'business')) input.collection = f.collection;
  if (original && (cadenceChanged || input.billing_timing)) input.reschedule_from = f.reschedule_from;
  return input;
}

function AgreementForm({
  initial,
  original,
  onSubmit,
  onCancel,
  pending,
}: {
  initial: FormState;
  original?: SupportAgreement;
  onSubmit: (input: SupportAgreementInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const standard = original?.kind === 'STANDARD';
  const cadenceEdited =
    !!original &&
    (f.billing_cycle !== original.billing_cycle ||
      f.billing_timing !== original.billing_timing ||
      (f.billing_cycle === 'CUSTOM' &&
        (Number(f.interval_count) !== original.interval_count || f.interval_unit !== original.interval_unit)));

  const submit = () => {
    if (!f.name.trim()) return toast.error('Name is required');
    if (!standard && !f.amount.trim()) return toast.error('Agreed amount per period is required');
    const input = toInput(f, original);
    if (typeof input === 'string') return toast.error(input);
    if (original && Object.keys(input).length === 0) return onCancel();
    onSubmit(input);
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className={labelClass}>Name (shown on invoices)</label>
          <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dedicated support engineer" />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Billing period</label>
          <select className={selectClass} value={f.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value as SupportCycle)}>
            {(Object.keys(SUPPORT_CYCLE_LABELS) as SupportCycle[]).map((c) => (
              <option key={c} value={c}>{SUPPORT_CYCLE_LABELS[c]}</option>
            ))}
          </select>
        </div>
        {f.billing_cycle === 'CUSTOM' ? (
          <div className="space-y-1">
            <label className={labelClass}>Every</label>
            <div className="flex gap-2">
              <Input type="number" min={1} value={f.interval_count} onChange={(e) => set('interval_count', e.target.value)} className="w-24" />
              <select className={selectClass} value={f.interval_unit} onChange={(e) => set('interval_unit', e.target.value as SupportIntervalUnit)}>
                <option value="MONTH">months (1 to 36)</option>
                <option value="DAY">days (7 to 366)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className={labelClass}>Charged</label>
            <select className={selectClass} value={f.billing_timing} onChange={(e) => set('billing_timing', e.target.value as SupportTiming)}>
              <option value="ADVANCE">At the start of each period</option>
              <option value="ARREARS">At the end of each period</option>
            </select>
          </div>
        )}
        {f.billing_cycle === 'CUSTOM' && (
          <div className="space-y-1">
            <label className={labelClass}>Charged</label>
            <select className={selectClass} value={f.billing_timing} onChange={(e) => set('billing_timing', e.target.value as SupportTiming)}>
              <option value="ADVANCE">At the start of each period</option>
              <option value="ARREARS">At the end of each period</option>
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className={labelClass}>Amount per period ({original?.currency ?? 'KES'}, before VAT)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={f.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder={standard ? `Prorated from ${formatCurrency(original?.annual_list_price ?? 0)} a year` : 'Agreed amount'}
          />
        </div>
        {!original && (
          <div className="space-y-1">
            <label className={labelClass}>Starts</label>
            <Input type="date" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <label className={labelClass}>Ends (optional)</label>
          <Input type="date" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Billing email (optional)</label>
          <Input type="email" value={f.billing_email} onChange={(e) => set('billing_email', e.target.value)} placeholder="Defaults to the subscription billing email" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className={labelClass}>Collection</label>
          <select className={selectClass} value={f.collection} onChange={(e) => set('collection', e.target.value as SupportCollection)}>
            <option value="business">Business (company books)</option>
            <option value="personal">Personal (paid into my personal channel, off the company books)</option>
          </select>
          {f.collection === 'personal' && (
            <p className="text-xs text-muted-foreground">
              Invoices keep the company letterhead but show only your personal channel and are never posted to the company ledger, eTIMS or revenue figures. They are listed under Treasury, Invoices, Personal.
            </p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <Input value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Scope, sales agreement reference" />
        </div>
        {cadenceEdited && (
          <div className="space-y-1 sm:col-span-2">
            <label className={labelClass}>Apply the new schedule</label>
            <select className={selectClass} value={f.reschedule_from} onChange={(e) => set('reschedule_from', e.target.value as FormState['reschedule_from'])}>
              <option value="next_period">From the next period (the current period stays as billed)</option>
              <option value="now">From today (cancels the current period if it has not been invoiced)</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          {original ? 'Save changes' : 'Create agreement'}
        </Button>
      </div>
    </div>
  );
}

function AgreementCard({ a, onEdit }: { a: SupportAgreement; onEdit: () => void }) {
  const update = useUpdateSupportAgreement();
  const setStatus = (status: SupportAgreement['status']) => {
    if (status === 'ENDED' && !confirm(`End "${a.name}"? Future periods that were not invoiced are cancelled.`)) return;
    update.mutate({ id: a.id, input: { status } });
  };
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{a.name}</span>
            <Badge variant={a.kind === 'SPECIAL' ? 'partial' : 'default'}>{a.kind === 'SPECIAL' ? 'special' : 'standard'}</Badge>
            {a.status !== 'ACTIVE' && <Badge variant="outline">{a.status.toLowerCase()}</Badge>}
            {a.collection === 'personal' && <Badge variant="outline">personal</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatCurrency(a.period_amount)} {supportPeriodLabel(a).toLowerCase()}, charged{' '}
            {a.billing_timing === 'ADVANCE' ? 'in advance' : 'at period end'}
            {a.amount == null && a.support_plan_code ? ` (prorated ${a.support_plan_code})` : ''}
            {' · '}
            {formatCurrency(a.monthly_equivalent)}/month
          </p>
          {a.status === 'ACTIVE' && (
            <p className="text-xs text-muted-foreground">Next period starts {new Date(a.next_period_start).toLocaleDateString()}</p>
          )}
          {a.notes && <p className="text-xs text-muted-foreground italic">{a.notes}</p>}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" title="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          {a.status === 'ACTIVE' && (
            <Button size="sm" variant="ghost" title="Pause billing" onClick={() => setStatus('PAUSED')}><Pause className="h-3.5 w-3.5" /></Button>
          )}
          {a.status === 'PAUSED' && (
            <Button size="sm" variant="ghost" title="Resume billing from today" onClick={() => setStatus('ACTIVE')}><Play className="h-3.5 w-3.5" /></Button>
          )}
          {a.status !== 'ENDED' && (
            <Button size="sm" variant="ghost" title="End agreement" onClick={() => setStatus('ENDED')}><Square className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      </div>
      <SupportChargesTable charges={a.cycles.map((c) => ({ ...c, agreement_name: a.name, agreement_kind: a.kind }))} />
    </div>
  );
}

/**
 * Per-tenant support agreements: the standard hosting and support fee of a one-time license
 * (billing period and price adjustable) plus any special support agreed with the tenant. Unpaid
 * charges past due date plus 7 days block create/edit/delete in every service until paid or waived.
 */
export function SupportAgreementsPanel({ tenantId, isOneTime }: { tenantId?: string; isOneTime?: boolean }) {
  const { data, isLoading } = useTenantSupportAgreements(tenantId);
  const create = useCreateSupportAgreement();
  const update = useUpdateSupportAgreement();
  const [mode, setMode] = useState<{ kind: 'create' } | { kind: 'edit'; agreement: SupportAgreement } | null>(null);

  if (!tenantId) return null;
  const agreements = data?.agreements ?? [];
  const totals = data?.outstanding;
  const hasStandard = agreements.some((a) => a.kind === 'STANDARD');

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Support agreements</h3>
          </div>
          {!mode && (
            <Button size="sm" variant="outline" onClick={() => setMode({ kind: 'create' })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Special support
            </Button>
          )}
        </div>

        {totals && totals.open_count > 0 && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              totals.blocking_count > 0 ? 'border-red-500/30 bg-red-500/5 text-red-600' : 'border-border bg-accent/30'
            }`}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {formatCurrency(totals.open_amount)} outstanding across {totals.open_count} charge(s)
              {totals.overdue_count > 0 && `, ${formatCurrency(totals.overdue_amount)} overdue`}
              {totals.blocking_count > 0 && '. Data changes are blocked for this tenant until paid or waived.'}
            </span>
          </div>
        )}

        {mode?.kind === 'create' && (
          <AgreementForm
            initial={emptyForm}
            pending={create.isPending}
            onCancel={() => setMode(null)}
            onSubmit={(input) =>
              create.mutate({ tenantId, input: { ...input, kind: 'SPECIAL' } }, { onSuccess: () => setMode(null) })
            }
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : agreements.length === 0 && !mode ? (
          <p className="text-sm text-muted-foreground">
            {isOneTime && !hasStandard
              ? 'The standard hosting and support agreement is created automatically within the hour.'
              : 'No support agreements. Add special support to bill this tenant on an agreed cycle.'}
          </p>
        ) : (
          agreements.map((a) =>
            mode?.kind === 'edit' && mode.agreement.id === a.id ? (
              <AgreementForm
                key={a.id}
                initial={formFrom(a)}
                original={a}
                pending={update.isPending}
                onCancel={() => setMode(null)}
                onSubmit={(input) => update.mutate({ id: a.id, input }, { onSuccess: () => setMode(null) })}
              />
            ) : (
              <AgreementCard key={a.id} a={a} onEdit={() => setMode({ kind: 'edit', agreement: a })} />
            ),
          )
        )}
      </CardContent>
    </Card>
  );
}
