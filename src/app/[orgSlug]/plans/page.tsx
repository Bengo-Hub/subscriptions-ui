'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useParams } from 'next/navigation';

interface PlanFeature {
  name: string;
  starter: string | boolean;
  growth: string | boolean;
  professional: string | boolean;
}

interface Plan {
  id: string;
  name: string;
  tier: 'starter' | 'growth' | 'professional';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  description: string;
  features: Record<string, string | number | boolean>;
  popular?: boolean;
}

interface CurrentSubscription {
  planId: string;
  planTier: string;
}

const FEATURE_MATRIX: PlanFeature[] = [
  { name: 'Orders per month', starter: '500', growth: '5,000', professional: 'Unlimited' },
  { name: 'Riders', starter: '10', growth: '50', professional: 'Unlimited' },
  { name: 'Outlets', starter: '1', growth: '5', professional: 'Unlimited' },
  { name: 'API calls per day', starter: '1,000', growth: '25,000', professional: 'Unlimited' },
  { name: 'Analytics dashboard', starter: true, growth: true, professional: true },
  { name: 'Custom branding', starter: false, growth: true, professional: true },
  { name: 'Priority support', starter: false, growth: true, professional: true },
  { name: 'Webhooks', starter: false, growth: true, professional: true },
  { name: 'Dedicated account manager', starter: false, growth: false, professional: true },
  { name: 'SLA guarantee', starter: false, growth: false, professional: true },
  { name: 'White-label', starter: false, growth: false, professional: true },
];

export default function PlansPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<Plan[]>('/api/v1/plans'),
  });

  const { data: current } = useQuery({
    queryKey: ['current-subscription', orgSlug],
    queryFn: () => apiClient.get<CurrentSubscription>(`/api/v1/tenants/${orgSlug}/subscription/current`),
  });

  const tiers: { key: Plan['tier']; label: string; color: string }[] = [
    { key: 'starter', label: 'Starter', color: 'border-muted' },
    { key: 'growth', label: 'Growth', color: 'border-primary' },
    { key: 'professional', label: 'Professional', color: 'border-primary' },
  ];

  const getPlan = (tier: string) => plans?.find((p) => p.tier === tier);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Scale your operations with the right tier. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map(({ key, label }) => {
          const plan = getPlan(key);
          const isCurrent = current?.planTier === key;
          const isPopular = key === 'growth';

          return (
            <Card
              key={key}
              className={cn(
                'relative',
                isPopular && 'ring-2 ring-primary shadow-lg shadow-primary/10',
                isCurrent && 'ring-2 ring-green-500'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="success">Current Plan</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <h3 className="text-lg font-bold">{label}</h3>
                {isLoading ? (
                  <div className="h-10 w-32 mx-auto bg-muted rounded animate-pulse mt-2" />
                ) : (
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">
                      {plan ? `$${plan.price}` : '—'}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{plan?.billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {plan?.description || `Perfect for ${label.toLowerCase()}-stage businesses`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {FEATURE_MATRIX.map((f) => {
                    const val = f[key as keyof PlanFeature];
                    const hasFeature = val !== false;
                    return (
                      <li key={f.name} className="flex items-center gap-2 text-sm">
                        {hasFeature ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={cn(!hasFeature && 'text-muted-foreground/40')}>
                          {typeof val === 'string' ? `${f.name}: ${val}` : f.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isPopular ? 'primary' : 'secondary'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : key === 'professional' ? 'Contact Sales' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Comparison Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Feature Comparison</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Feature</th>
                {tiers.map((t) => (
                  <th key={t.key} className="text-center py-3 px-4 font-semibold">
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((f) => (
                <tr key={f.name} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium">{f.name}</td>
                  {tiers.map((t) => {
                    const val = f[t.key as keyof PlanFeature];
                    return (
                      <td key={t.key} className="text-center py-3 px-4">
                        {typeof val === 'boolean' ? (
                          val ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
