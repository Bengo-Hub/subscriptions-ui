'use client';

import { Badge, Button, Card, CardContent, CardHeader, Progress } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency as sharedFormatCurrency } from '@bengo-hub/shared-ui-lib';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  Gauge,
  Package,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';

// Subscription response matches backend SubscriptionResult (snake_case JSON tags)
interface Subscription {
  id: string;
  tenant_id: string;
  plan_code: string;
  plan_name: string;
  status: string; // ACTIVE | TRIAL | EXPIRED | CANCELLED | SUSPENDED
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string | null;
  cancelled_at?: string | null;
  features: string[];
  limits: Record<string, number>;
  billing_mode?: 'recurring' | 'one_time' | 'service_charge';
  plan_type?: string;
  is_perpetual?: boolean;
}

// Dashboard usage summary: { orders: {used, limit}, riders: {used, limit}, ... }
interface UsageSummary {
  orders?: { used: number; limit: number };
  riders?: { used: number; limit: number };
  outlets?: { used: number; limit: number };
  api_calls?: { used: number; limit: number };
  [key: string]: { used: number; limit: number } | undefined;
}

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

// Centralized in shared-ui-lib — was a local hardcoded-"KES" copy duplicated in platform/page.tsx.
const fmtKES = (n?: number) => (n != null ? sharedFormatCurrency(n) : '—');

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);

  const { data: subscription, isLoading: subLoading, isError: subError } = useQuery({
    queryKey: ['subscription', selectedTenant?.id],
    queryFn: () => apiClient.get<Subscription>('/api/v1/subscription'),
    enabled: !isPlatformOwner || !!selectedTenant,
  });

  const { data: usage, isLoading: usageLoading, isError: usageError } = useQuery({
    queryKey: ['usage-summary', selectedTenant?.id],
    queryFn: () => apiClient.get<UsageSummary>('/api/v1/usage/summary'),
    enabled: !isPlatformOwner || !!selectedTenant,
  });

  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => apiClient.get<PlatformStats>('/api/v1/platform/stats'),
    enabled: !!isPlatformOwner,
  });

  // Status is uppercase from backend — normalize for display and variant
  const statusVariant = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'ACTIVE': return 'success' as const;
      case 'TRIAL': case 'TRIALING': return 'default' as const;
      case 'SUSPENDED': case 'PAST_DUE': return 'warning' as const;
      case 'CANCELLED': case 'EXPIRED': return 'error' as const;
      default: return 'outline' as const;
    }
  };

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const usagePct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : 0);
  const usageVariant = (used: number, limit: number) => {
    const pct = usagePct(used, limit);
    if (pct >= 90) return 'danger' as const;
    if (pct >= 75) return 'warning' as const;
    return 'default' as const;
  };

  // Display-friendly label for usage keys
  const usageLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
            {isPlatformOwner && selectedTenant && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Viewing: {selectedTenant.name}
              </span>
            )}
            {isPlatformOwner && !selectedTenant && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                Platform-wide view
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {isPlatformOwner ? (
            <>
              <Link href="/platform">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Platform Admin
                </Button>
              </Link>
              <Link href="/platform/tenants">
                <Button variant="outline" size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Tenants
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/plans">
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </Link>
              <Link href="/billing">
                <Button variant="outline" size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Platform Stats (platform owner only, no tenant selected) */}
      {isPlatformOwner && !selectedTenant && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="space-y-2 pt-6">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </CardContent></Card>
              ))
            : [
                { label: 'Total Plans', value: platformStats?.totalPlans ?? 0, sub: `${platformStats?.activePlans ?? 0} active`, icon: Package },
                { label: 'Subscriptions', value: platformStats?.totalSubscriptions ?? 0, sub: `${platformStats?.activeSubscriptions ?? 0} active`, icon: Users },
                { label: 'Monthly Revenue', value: fmtKES(platformStats?.mrr), sub: platformStats?.currency ?? 'KES', icon: BarChart3 },
                { label: 'Trialing', value: platformStats?.trialingCount ?? 0, sub: `${platformStats?.churnedCount ?? 0} churned`, icon: TrendingUp },
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
      )}

      {/* Subscription Status — shown for tenant users or when a tenant is selected by platform owner */}
      {(!isPlatformOwner || selectedTenant) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Active Subscription</h2>
              </div>
              {!subLoading && subscription && (
                <Badge variant={statusVariant(subscription.status)}>
                  {subscription.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-72 bg-muted rounded animate-pulse" />
              </div>
            ) : subError ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-2">Unable to load subscription details.</p>
                <p className="text-xs text-muted-foreground">Please try refreshing the page or contact support if the issue persists.</p>
              </div>
            ) : subscription ? (
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
                  <p className="text-lg font-bold mt-1">{subscription.plan_name ?? 'Unknown Plan'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{subscription.plan_code ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Period</p>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Renewal</p>
                  <p className="text-sm font-medium mt-1">
                    {subscription.is_perpetual ? (
                      <span>Perpetual licence — never expires</span>
                    ) : subscription.billing_mode === 'service_charge' ? (
                      <span>Pay-as-you-go (service charge)</span>
                    ) : subscription.cancelled_at ? (
                      <span className="text-destructive">Cancels on {formatDate(subscription.current_period_end)}</span>
                    ) : (
                      <span>Auto-renews {formatDate(subscription.current_period_end)}</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No active subscription</p>
                {!isPlatformOwner && (
                  <Link href="/plans">
                    <Button>Browse Plans</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Summary */}
      {(!isPlatformOwner || selectedTenant) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Usage Overview
            </h2>
            <Link href="/usage" className="text-sm text-primary hover:underline flex items-center gap-1">
              View Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {usageLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-2.5 w-full bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))
              : usageError
              ? (
                <Card className="sm:col-span-2 lg:col-span-4">
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">Unable to load usage data.</p>
                  </CardContent>
                </Card>
              )
              : usage && Object.entries(usage)
                  .filter(([, val]) => val != null && typeof val === 'object' && 'used' in val && 'limit' in val)
                  .map(([key, val]) => {
                    const v = val as { used: number; limit: number };
                    return (
                      <Card key={key}>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium capitalize">{usageLabel(key)}</p>
                            <span className="text-xs text-muted-foreground">
                              {v.used ?? 0}/{v.limit ?? 0}
                            </span>
                          </div>
                          <Progress value={v.used ?? 0} max={v.limit ?? 0} variant={usageVariant(v.used ?? 0, v.limit ?? 0)} />
                          <p className="text-xs text-muted-foreground">{usagePct(v.used ?? 0, v.limit ?? 0)}% used</p>
                        </CardContent>
                      </Card>
                    );
                  })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        {isPlatformOwner ? (
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/platform/plans">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Manage Plans</p>
                    <p className="text-xs text-muted-foreground">Create & edit plans</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/platform/subscriptions">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">All Subscriptions</p>
                    <p className="text-xs text-muted-foreground">View & manage</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/platform/service-charges">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Service Charges</p>
                    <p className="text-xs text-muted-foreground">Configure rates</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/plans">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Compare Plans</p>
                    <p className="text-xs text-muted-foreground">Find the right tier</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/usage">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Check Usage</p>
                    <p className="text-xs text-muted-foreground">Monitor limits</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/billing">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Next Invoice</p>
                    <p className="text-xs text-muted-foreground">View billing cycle</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
