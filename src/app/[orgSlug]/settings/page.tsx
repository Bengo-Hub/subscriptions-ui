'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface SubscriptionSettings {
  autoRenew: boolean;
  billingEmail: string;
  notifyBeforeRenewal: boolean;
  notifyOnUsageThreshold: boolean;
  usageThresholdPercent: number;
  cancellationFeedback?: string;
}

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['sub-settings', orgSlug],
    queryFn: () => apiClient.get<SubscriptionSettings>(`/api/v1/tenants/${orgSlug}/subscription/settings`),
  });

  const [form, setForm] = useState<Partial<SubscriptionSettings>>({});
  const merged = { ...settings, ...form };

  const mutation = useMutation({
    mutationFn: (data: Partial<SubscriptionSettings>) =>
      apiClient.put(`/api/v1/tenants/${orgSlug}/subscription/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-settings', orgSlug] });
      toast.success('Settings saved');
      setForm({});
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => mutation.mutate(merged);

  const toggle = (key: keyof SubscriptionSettings) => {
    setForm((prev) => ({ ...prev, [key]: !merged[key] }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Settings</h1>
        <p className="text-muted-foreground mt-1">Configure renewal, notifications, and billing preferences.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Renewal */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Renewal</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-Renew Subscription</p>
                  <p className="text-xs text-muted-foreground">Automatically renew at the end of each billing cycle.</p>
                </div>
                <button
                  onClick={() => toggle('autoRenew')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    merged.autoRenew ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      merged.autoRenew ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Notifications</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Renewal Reminder</p>
                  <p className="text-xs text-muted-foreground">Get notified before your subscription renews.</p>
                </div>
                <button
                  onClick={() => toggle('notifyBeforeRenewal')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    merged.notifyBeforeRenewal ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      merged.notifyBeforeRenewal ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usage Threshold Alert</p>
                  <p className="text-xs text-muted-foreground">
                    Alert when usage hits {merged.usageThresholdPercent || 80}% of any limit.
                  </p>
                </div>
                <button
                  onClick={() => toggle('notifyOnUsageThreshold')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    merged.notifyOnUsageThreshold ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      merged.notifyOnUsageThreshold ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {merged.notifyOnUsageThreshold && (
                <div className="flex items-center gap-3 pl-4 border-l-2 border-primary/20">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Threshold %</label>
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={merged.usageThresholdPercent || 80}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, usageThresholdPercent: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Email */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Billing Contact</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Billing Email</label>
                <Input
                  type="email"
                  value={merged.billingEmail || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, billingEmail: e.target.value }))}
                  placeholder="billing@company.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Invoices and receipts will be sent here.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
