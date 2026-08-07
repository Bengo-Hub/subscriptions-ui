'use client';

import { Badge, Card, CardContent } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, BarChart3, Building2, KeyRound, Package, Shield, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency as sharedFormatCurrency } from '@bengo-hub/shared-ui-lib';

interface PlatformStats {
  totalPlans: number;
  activePlans?: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  mrr: number;
  currency: string;
  trialingCount?: number;
  churnedCount?: number;
}

// Centralized in shared-ui-lib — was a local hardcoded-"KES" copy duplicated in app/page.tsx.
const fmtKES = (n?: number) => (n != null ? sharedFormatCurrency(n) : '—');

const adminSections = [
  {
    href: '/platform/plans',
    icon: Package,
    label: 'Plans',
    description: 'Create, edit, and manage all subscription plans across every service group',
    color: 'text-primary bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground',
  },
  {
    href: '/platform/service-charges',
    icon: BadgePercent,
    label: 'Service Charges',
    description: 'Configure commission rates and transaction fees applied per service',
    color: 'text-amber-500 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white',
  },
  {
    href: '/platform/licenses',
    icon: KeyRound,
    label: 'Licenses',
    description: 'Manage one-time and perpetual license plans, view and assign to tenants',
    color: 'text-purple-500 bg-purple-500/10 group-hover:bg-purple-500 group-hover:text-white',
  },
  {
    href: '/platform/tenants',
    icon: Building2,
    label: 'Tenants',
    description: 'View all tenants, assign subscription plans, and manage account status',
    color: 'text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white',
  },
  {
    href: '/platform/subscriptions',
    icon: Users,
    label: 'Subscriptions',
    description: 'Browse all active, trialing, and expired subscriptions across the platform',
    color: 'text-blue-500 bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white',
  },
];

export default function PlatformPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => apiClient.get<PlatformStats>('/api/v1/platform/stats'),
    enabled: !!isPlatformOwner,
  });

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Administration</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage plans, pricing, service charges, licenses, and tenant subscriptions.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="space-y-2 pt-6">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </CardContent></Card>
            ))
          : [
              {
                label: 'Total Plans',
                value: stats?.totalPlans ?? 0,
                sub: `${stats?.activePlans ?? 0} active`,
                icon: Package,
              },
              {
                label: 'Subscriptions',
                value: stats?.totalSubscriptions ?? 0,
                sub: `${stats?.activeSubscriptions ?? 0} active`,
                icon: Users,
              },
              {
                label: 'Monthly Revenue',
                value: fmtKES(stats?.mrr),
                sub: stats?.currency ?? 'KES',
                icon: BarChart3,
              },
              {
                label: 'Trialing',
                value: stats?.trialingCount ?? 0,
                sub: `${stats?.churnedCount ?? 0} churned`,
                icon: TrendingUp,
              },
            ].map(({ label, value, sub, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <Icon className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <p className="text-3xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Admin section cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-1">
          Admin Sections
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminSections.map(({ href, icon: Icon, label, description, color }) => (
            <Link key={href} href={href}>
              <Card className="hover:border-primary/40 transition-all duration-200 cursor-pointer group h-full">
                <CardContent className="pt-6 flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick info */}
      <div className="rounded-2xl border border-border bg-accent/30 px-6 py-4 flex items-start gap-3">
        <Badge variant="outline" className="mt-0.5 shrink-0">Tip</Badge>
        <p className="text-sm text-muted-foreground">
          Plans are grouped by service (Delivery, POS, Inventory, ERP, Logistics, TruLoad). Service charges
          define commission rates per transaction. Licenses are one-time or perpetual plans assigned directly
          to tenants. Use the Tenants section to force-assign plans or update subscription status.
        </p>
      </div>
    </div>
  );
}
