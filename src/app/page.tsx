'use client';

import { Badge, Button, Card, CardContent, CardHeader, Progress } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Gauge,
  Package,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';


interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  plan: {
    id: string;
    name: string;
    tier: string;
  };
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageSummary {
  orders: { used: number; limit: number };
  riders: { used: number; limit: number };
  outlets: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.get<Subscription>('/api/v1/subscription'),
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage-summary'],
    queryFn: () => apiClient.get<UsageSummary>('/api/v1/usage/summary'),
  });

  const statusVariant = (s?: string) => {
    switch (s) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'default';
      case 'past_due':
        return 'warning';
      case 'canceled':
      case 'expired':
        return 'error';
      default:
        return 'outline';
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  const usagePct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : 0);
  const usageVariant = (used: number, limit: number) => {
    const pct = usagePct(used, limit);
    if (pct >= 90) return 'danger' as const;
    if (pct >= 75) return 'warning' as const;
    return 'default' as const;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
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
        </div>
      </div>

      {/* Subscription Status */}
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
          ) : subscription ? (
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
                <p className="text-lg font-bold mt-1">{subscription.plan.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{subscription.plan.tier} tier</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Period</p>
                <p className="text-sm font-medium mt-1">
                  {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Renewal</p>
                <p className="text-sm font-medium mt-1">
                  {subscription.cancelAtPeriodEnd ? (
                    <span className="text-destructive">Cancels on {formatDate(subscription.currentPeriodEnd)}</span>
                  ) : (
                    <span>Auto-renews {formatDate(subscription.currentPeriodEnd)}</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No active subscription</p>
              <Link href="/plans">
                <Button>Browse Plans</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Summary */}
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
            : usage &&
            Object.entries(usage).map(([key, val]) => (
              <Card key={key}>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <span className="text-xs text-muted-foreground">
                      {val.used}/{val.limit}
                    </span>
                  </div>
                  <Progress value={val.used} max={val.limit} variant={usageVariant(val.used, val.limit)} />
                  <p className="text-xs text-muted-foreground">{usagePct(val.used, val.limit)}% used</p>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
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
      </div>
    </div>
  );
}
