'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PlatformStats {
  totalPlans: number;
  activePlans: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
  currency: string;
  trialingCount: number;
  churnedCount: number;
}

export default function PlatformPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const orgSlug = user?.tenant_slug;

  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  useEffect(() => {
    if (user && !isPlatformOwner) {
      router.replace('/');
    }
  }, [user, isPlatformOwner, router]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => apiClient.get<PlatformStats>('/api/v1/platform/stats'),
    enabled: !!isPlatformOwner,
  });

  const formatCurrency = (amount?: number, currency = 'USD') =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount) : '—';

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Administration</h1>
          <p className="text-muted-foreground mt-1">Manage plans, subscriptions, and platform-wide settings.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : (
            <>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total Plans</p>
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold mt-1">{stats?.totalPlans ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.activePlans ?? 0} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Subscriptions</p>
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold mt-1">{stats?.totalSubscriptions ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.activeSubscriptions ?? 0} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalRevenue, stats?.currency)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Trialing</p>
                    <Badge variant="default">{stats?.trialingCount ?? 0}</Badge>
                  </div>
                  <p className="text-3xl font-bold mt-1">{stats?.churnedCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">churned this month</p>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      {/* Quick Nav */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Link href={`/${orgSlug}/platform/plans`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Plans Management</p>
                <p className="text-sm text-muted-foreground">Create, edit, and manage subscription plans</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${orgSlug}/platform/subscriptions`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">All Subscriptions</p>
                <p className="text-sm text-muted-foreground">View and manage all tenant subscriptions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
