'use client';

import { Badge, Card, CardContent, CardHeader, Progress } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Globe,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { useParams } from 'next/navigation';

interface UsageMetric {
  name: string;
  key: string;
  used: number;
  limit: number;
  unit: string;
  resetDate: string;
}

interface UsageResponse {
  metrics: UsageMetric[];
  billingPeriod: { start: string; end: string };
  plan: string;
}

const METRIC_ICONS: Record<string, any> = {
  orders: ShoppingCart,
  riders: Truck,
  outlets: Globe,
  api_calls: Zap,
  users: Users,
  products: Package,
  reports: BarChart3,
};

export default function UsagePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const { data, isLoading } = useQuery({
    queryKey: ['usage', orgSlug],
    queryFn: () => apiClient.get<UsageResponse>(`/api/v1/tenants/${orgSlug}/usage`),
  });

  const pct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : 0);
  const variant = (used: number, limit: number) => {
    const p = pct(used, limit);
    if (p >= 90) return 'danger' as const;
    if (p >= 75) return 'warning' as const;
    return 'default' as const;
  };
  const badgeVariant = (used: number, limit: number) => {
    const p = pct(used, limit);
    if (p >= 90) return 'error' as const;
    if (p >= 75) return 'warning' as const;
    return 'success' as const;
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your resource consumption across all tracked features.
          </p>
        </div>
        {data && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.plan}</span> plan &middot; Resets{' '}
            {formatDate(data.billingPeriod.end)}
          </div>
        )}
      </div>

      {/* Overage Warning */}
      {data?.metrics.some((m) => pct(m.used, m.limit) >= 90) && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Approaching Usage Limits</p>
              <p className="text-xs text-muted-foreground mt-1">
                One or more metrics are at 90%+ capacity. Consider upgrading your plan to avoid overage charges.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Meters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-2.5 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))
          : data?.metrics.map((metric) => {
              const Icon = METRIC_ICONS[metric.key] || Package;
              const p = pct(metric.used, metric.limit);
              const isOverage = p >= 100;

              return (
                <Card key={metric.key} className={cn(isOverage && 'border-red-500/50')}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">{metric.name}</h3>
                      </div>
                      <Badge variant={badgeVariant(metric.used, metric.limit)}>
                        {p}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={metric.used} max={metric.limit} variant={variant(metric.used, metric.limit)} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">{metric.used.toLocaleString()}</span> /{' '}
                        {metric.limit.toLocaleString()} {metric.unit}
                      </span>
                      <span>{metric.limit - metric.used > 0 ? `${(metric.limit - metric.used).toLocaleString()} remaining` : 'Limit reached'}</span>
                    </div>
                    {isOverage && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overage charges may apply
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
