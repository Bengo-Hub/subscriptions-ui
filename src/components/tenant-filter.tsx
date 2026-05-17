'use client';

import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore, type TenantOption } from '@/store/tenant-filter';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
}

/**
 * TenantFilter — single-select dropdown shown only to platform owners.
 * Selecting a tenant scopes all pages to that tenant's data.
 * Selecting "All Tenants" (default) shows platform-wide data.
 */
export function TenantFilter({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const { selectedTenant, setSelectedTenant, clearTenant } = useTenantFilterStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: ['platform_tenants_filter_list'],
    queryFn: () =>
      apiClient
        .get<{ data: TenantItem[]; total: number }>('/api/v1/admin/tenants', { pageSize: 200 })
        .then((r) => r.data.filter((t) => t.slug !== 'codevertex')),
    enabled: !!isPlatformOwner,
    staleTime: 10 * 60_000,
  });

  if (!isPlatformOwner) return null;

  const filtered = search
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : tenants;

  const label = selectedTenant ? selectedTenant.name : 'All Tenants';

  const select = (t: TenantItem) => {
    const opt: TenantOption = { id: t.id, slug: t.slug, name: t.name };
    setSelectedTenant(opt);
    setOpen(false);
    setSearch('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTenant();
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-44"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        {selectedTenant && (
          <span
            onClick={clear}
            className="p-0.5 rounded hover:bg-muted-foreground/20 cursor-pointer"
            role="button"
            aria-label="Clear filter"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl flex flex-col">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                placeholder="Search tenants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-accent/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* All Tenants option */}
            <button
              type="button"
              onClick={() => { clearTenant(); setOpen(false); setSearch(''); }}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                !selectedTenant && 'bg-primary/10 text-primary',
              )}
            >
              {!selectedTenant ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0" />}
              All Tenants
            </button>

            <div className="max-h-60 overflow-y-auto">
              {filtered.map((t) => {
                const sel = selectedTenant?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => select(t)}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors',
                      sel && 'bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'h-3.5 w-3.5 shrink-0 rounded-full border flex items-center justify-center',
                      sel ? 'bg-primary border-primary' : 'border-border',
                    )}>
                      {sel && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{t.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{t.slug}</span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No tenants found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
