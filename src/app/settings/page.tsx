'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { apiClient } from '@/lib/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Database, Palette, Plus, Shield, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/useMe';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubscriptionSettings {
  autoRenew: boolean;
  billingEmail: string;
  notifyBeforeRenewal: boolean;
  notifyOnUsageThreshold: boolean;
  usageThresholdPercent: number;
}

interface ServiceConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string;
  isSecret: boolean;
  updatedAt: string;
}

// ── Platform Admin: Service Configs ───────────────────────────────────────────

function PlatformSettingsView() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceConfig>>({});
  const [newForm, setNewForm] = useState({ configKey: '', configValue: '', configType: 'string', description: '', isSecret: false });
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-service-configs'],
    queryFn: () => apiClient.get<{ data: ServiceConfig[]; total: number }>('/api/v1/admin/configs'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ServiceConfig> }) =>
      apiClient.put(`/api/v1/admin/configs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-configs'] });
      toast.success('Config updated');
      setEditingId(null);
      setEditForm({});
    },
    onError: () => toast.error('Failed to update config'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newForm) => apiClient.post('/api/v1/admin/configs', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-configs'] });
      toast.success('Config created');
      setShowNew(false);
      setNewForm({ configKey: '', configValue: '', configType: 'string', description: '', isSecret: false });
    },
    onError: () => toast.error('Failed to create config'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-configs'] });
      toast.success('Config deleted');
    },
    onError: () => toast.error('Failed to delete config'),
  });

  const configs = data?.data ?? [];

  // Group configs by prefix (e.g. "subscriptions", "billing", etc.)
  const grouped = configs.reduce<Record<string, ServiceConfig[]>>((acc, c) => {
    const prefix = c.configKey.includes('.') ? c.configKey.split('.')[0] : 'general';
    (acc[prefix] ??= []).push(c);
    return acc;
  }, {});

  const startEdit = (c: ServiceConfig) => {
    setEditingId(c.id);
    setEditForm({ configValue: c.configValue, configType: c.configType, description: c.description, isSecret: c.isSecret });
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({ id, body: editForm });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage platform-level service configs and system settings.</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Config
        </Button>
      </div>

      {/* New config form */}
      {showNew && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">New Config</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Key</label>
                <Input
                  placeholder="subscriptions.my_setting"
                  value={newForm.configKey}
                  onChange={(e) => setNewForm((p) => ({ ...p, configKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={newForm.configType}
                  onChange={(e) => setNewForm((p) => ({ ...p, configType: e.target.value }))}
                >
                  <option value="string">string</option>
                  <option value="int">int</option>
                  <option value="bool">bool</option>
                  <option value="float">float</option>
                  <option value="json">json</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <Input
                placeholder="config value"
                value={newForm.configValue}
                onChange={(e) => setNewForm((p) => ({ ...p, configValue: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input
                placeholder="What does this config do?"
                value={newForm.description}
                onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSecret"
                checked={newForm.isSecret}
                onChange={(e) => setNewForm((p) => ({ ...p, isSecret: e.target.checked }))}
              />
              <label htmlFor="isSecret" className="text-sm text-muted-foreground">Secret (mask value in UI)</label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => createMutation.mutate(newForm)}
                disabled={createMutation.isPending || !newForm.configKey || !newForm.configValue}
                size="sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <Card key={group}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="font-semibold capitalize">{group}</h2>
                <Badge variant="outline">{items.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((c) => (
                  <div key={c.id} className="px-6 py-4">
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <p className="text-sm font-mono font-medium text-foreground">{c.configKey}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Value</label>
                            <Input
                              value={editForm.configValue ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, configValue: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Type</label>
                            <select
                              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                              value={editForm.configType ?? 'string'}
                              onChange={(e) => setEditForm((p) => ({ ...p, configType: e.target.value }))}
                            >
                              <option value="string">string</option>
                              <option value="int">int</option>
                              <option value="bool">bool</option>
                              <option value="float">float</option>
                              <option value="json">json</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Description</label>
                          <Input
                            value={editForm.description ?? ''}
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.isSecret ?? false}
                            onChange={(e) => setEditForm((p) => ({ ...p, isSecret: e.target.checked }))}
                          />
                          <span className="text-sm text-muted-foreground">Secret</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(c.id)} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-sm font-mono text-foreground">{c.configKey}</code>
                            <Badge variant="outline" className="text-[10px]">{c.configType}</Badge>
                            {c.isSecret && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">secret</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                          <p className="text-sm font-medium mt-1 font-mono">
                            {c.isSecret ? '••••••••' : c.configValue}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Updated {new Date(c.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
                          <button
                            onClick={() => deleteMutation.mutate(c.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                            title="Delete config"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Tenant: Subscription Settings ─────────────────────────────────────────────

function TenantSettingsView() {
  const queryClient = useQueryClient();
  const { tenant, isLoading: brandingLoading } = useTenantBranding();
  const logoUrl = tenant?.logoUrl;
  const primaryColor = tenant?.primaryColor;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['sub-settings'],
    queryFn: () => apiClient.get<SubscriptionSettings>('/api/v1/subscription/settings'),
  });

  const [form, setForm] = useState<Partial<SubscriptionSettings>>({});
  const merged = { ...settings, ...form };

  const mutation = useMutation({
    mutationFn: (data: Partial<SubscriptionSettings>) =>
      apiClient.put('/api/v1/subscription/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-settings'] });
      toast.success('Settings saved');
      setForm({});
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const toggle = (key: keyof SubscriptionSettings) => {
    setForm((prev) => ({ ...prev, [key]: !merged[key] }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Settings</h1>
        <p className="text-muted-foreground mt-1">Configure renewal, notifications, and billing preferences.</p>
      </div>

      {!brandingLoading && (tenant || logoUrl || primaryColor) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tenant & Branding</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant && (
              <p className="text-sm text-muted-foreground">
                <strong>{tenant.name}</strong> ({tenant.slug}). Branding is loaded from auth-api tenant metadata.
              </p>
            )}
            {(logoUrl || primaryColor) && (
              <div className="flex items-center gap-4">
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 object-contain" />}
                {primaryColor && <div className="h-8 w-24 rounded border" style={{ backgroundColor: primaryColor }} title="Primary" />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.autoRenew ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.autoRenew ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.notifyBeforeRenewal ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.notifyBeforeRenewal ? 'translate-x-6' : 'translate-x-1'}`} />
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.notifyOnUsageThreshold ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.notifyOnUsageThreshold ? 'translate-x-6' : 'translate-x-1'}`} />
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
                    onChange={(e) => setForm((prev) => ({ ...prev, usageThresholdPercent: Number(e.target.value) }))}
                    className="w-24"
                  />
                </div>
              )}
            </CardContent>
          </Card>

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
            <Button onClick={() => mutation.mutate(merged)} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Root page: role-gated ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useMe();
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  return isPlatformOwner ? <PlatformSettingsView /> : <TenantSettingsView />;
}
