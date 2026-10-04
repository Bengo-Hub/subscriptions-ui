'use client';

import { Button, Card, CardContent, Input } from '@/components/ui/base';
import { SupportChargesTable } from '@/components/support/SupportChargesTable';
import { useSupportCharges } from '@/hooks/useSupportAgreements';
import type { SupportKind } from '@/lib/api/support';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@bengo-hub/shared-ui-lib';
import { AlertTriangle, Clock, Headset, Search, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

const VIEWS = [
  { key: 'open', label: 'Open', status: 'PENDING,INVOICED,OVERDUE' },
  { key: 'blocking', label: 'Blocking', status: '', blocking: true },
  { key: 'overdue', label: 'Overdue', status: 'OVERDUE' },
  { key: 'settled', label: 'Settled', status: 'PAID,WAIVED' },
  { key: 'all', label: 'All', status: '' },
] as const;

/**
 * Platform support receivables: every tenant's hosting and support and special support charges,
 * filtered and paginated server-side, with the outstanding totals for the current filter.
 */
export default function PlatformSupportPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('open');
  const [kind, setKind] = useState<SupportKind | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const active = VIEWS.find((v) => v.key === view)!;
  const { data, isLoading, isFetching } = useSupportCharges(
    {
      page,
      limit,
      status: active.status || undefined,
      blocking: 'blocking' in active ? active.blocking : undefined,
      kind: kind || undefined,
      search,
    },
    !!isPlatformOwner,
  );

  if (!isPlatformOwner) return null;
  const totals = data?.outstanding;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Headset className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Billing</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Hosting and support fees of one-time license tenants and special support agreements. Charges unpaid 7
            days after their due date block data changes for that tenant.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Outstanding', icon: Wallet, amount: totals?.open_amount, count: totals?.open_count, tone: '' },
          { label: 'Overdue', icon: Clock, amount: totals?.overdue_amount, count: totals?.overdue_count, tone: 'text-amber-500' },
          { label: 'Blocking tenants', icon: AlertTriangle, amount: totals?.blocking_amount, count: totals?.blocking_count, tone: 'text-red-500' },
        ].map(({ label, icon: Icon, amount, count, tone }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${tone || 'text-muted-foreground/50'}`} />
              </div>
              <p className={`text-2xl font-bold ${tone}`}>{amount != null ? formatCurrency(amount) : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">{count ?? 0} charge(s), matching the kind and search filters</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <SupportChargesTable
            showTenant
            storageKey="platform-support-charges"
            charges={data?.data ?? []}
            loading={isLoading || isFetching}
            paging={{
              page,
              total: data?.total ?? 0,
              totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / limit)),
              onPageChange: setPage,
              pageSize: limit,
              onPageSizeChange: (n) => {
                setLimit(n);
                setPage(1);
              },
            }}
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-border p-0.5">
                  {VIEWS.map((v) => (
                    <Button
                      key={v.key}
                      size="sm"
                      variant={view === v.key ? 'primary' : 'ghost'}
                      onClick={() => {
                        setView(v.key);
                        setPage(1);
                      }}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
                <select
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as SupportKind | '');
                    setPage(1);
                  }}
                >
                  <option value="">All agreements</option>
                  <option value="STANDARD">Hosting and support</option>
                  <option value="SPECIAL">Special support</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tenant name or slug"
                    className="h-9 pl-8 w-56"
                  />
                </div>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
