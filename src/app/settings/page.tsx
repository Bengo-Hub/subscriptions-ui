'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Database, Globe, Link2, Loader2, Palette, Plus, Shield, Settings as SettingsIcon, Trash2 } from 'lucide-react';
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

// ── Shared helpers ─────────────────────────────────────────────────────────────

function contrastColor(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#1a1a1a' : '#ffffff';
}

function BrandSwitch({
  checked,
  onToggle,
  brandColor,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  brandColor: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      disabled={disabled}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: checked ? brandColor : '#d1d5db',
      }}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ── Platform Admin: Service Configs ───────────────────────────────────────────

function PlatformSettingsView() {
  const queryClient = useQueryClient();
  const { tenant } = useTenantBranding();
  const brandColor = tenant?.primaryColor ?? '#722F5F';
  const brandTextColor = contrastColor(brandColor);
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

  const grouped = configs.reduce<Record<string, ServiceConfig[]>>((acc, c) => {
    const prefix = c.configKey.includes('.') ? c.configKey.split('.')[0] : 'general';
    (acc[prefix] ??= []).push(c);
    return acc;
  }, {});

  const startEdit = (c: ServiceConfig) => {
    setEditingId(c.id);
    setEditForm({ configValue: c.configValue, configType: c.configType, description: c.description, isSecret: c.isSecret });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage platform-level service configs and system settings.</p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ backgroundColor: brandColor, color: brandTextColor }}
        >
          <Plus className="h-4 w-4" />
          Add Config
        </Button>
      </div>

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
                style={{ backgroundColor: brandColor, color: brandTextColor }}
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
                          <Button
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: c.id, body: editForm })}
                            disabled={updateMutation.isPending}
                            style={{ backgroundColor: brandColor, color: brandTextColor }}
                          >
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

type SettingsTab = 'renewal' | 'notifications' | 'billing';

function TenantSettingsView() {
  const queryClient = useQueryClient();
  const { tenant, isLoading: brandingLoading } = useTenantBranding();
  const brandColor = tenant?.primaryColor ?? '#722F5F';
  const brandTextColor = contrastColor(brandColor);
  const logoUrl = tenant?.logoUrl;

  const [activeTab, setActiveTab] = useState<SettingsTab>('renewal');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['sub-settings'],
    queryFn: () => apiClient.get<SubscriptionSettings>('/api/v1/subscription/settings'),
  });

  const [form, setForm] = useState<Partial<SubscriptionSettings>>({});
  const merged = { ...settings, ...form };
  const hasPendingChanges = Object.keys(form).length > 0;

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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'renewal', label: 'Renewal', icon: <Shield className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'billing', label: 'Billing Contact', icon: <SettingsIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscription Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm">Configure renewal, notifications, and billing preferences.</p>
          </div>
          {/* Branding pill */}
          {!brandingLoading && tenant && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-card rounded-xl border border-border shadow-sm">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 object-contain" />}
              <div
                className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: brandColor }}
                title={`Brand: ${brandColor}`}
              />
              <span className="text-xs font-medium text-foreground">{tenant.name}</span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl border-b-2',
                activeTab === tab.id
                  ? 'border-b-2 bg-card/80 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40',
              )}
              style={activeTab === tab.id ? { borderBottomColor: brandColor, color: brandColor } : {}}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'renewal' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" style={{ color: brandColor }} />
                    <h2 className="font-semibold">Auto-Renewal</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Auto-Renew Subscription</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically renew at the end of each billing cycle.
                      </p>
                    </div>
                    <BrandSwitch
                      checked={!!merged.autoRenew}
                      onToggle={() => toggle('autoRenew')}
                      brandColor={brandColor}
                    />
                  </div>
                  {merged.autoRenew && (
                    <p className="mt-3 text-xs px-3 py-2 rounded-lg bg-muted text-muted-foreground">
                      Your subscription will renew automatically. Ensure a payment method is saved in Billing.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" style={{ color: brandColor }} />
                    <h2 className="font-semibold">Notification Preferences</h2>
                  </div>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <div className="flex items-center justify-between py-4 first:pt-0">
                    <div>
                      <p className="text-sm font-medium">Renewal Reminder</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Get notified before your subscription renews.
                      </p>
                    </div>
                    <BrandSwitch
                      checked={!!merged.notifyBeforeRenewal}
                      onToggle={() => toggle('notifyBeforeRenewal')}
                      brandColor={brandColor}
                    />
                  </div>
                  <div className="py-4 last:pb-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Usage Threshold Alert</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Alert when usage hits {merged.usageThresholdPercent || 80}% of any limit.
                        </p>
                      </div>
                      <BrandSwitch
                        checked={!!merged.notifyOnUsageThreshold}
                        onToggle={() => toggle('notifyOnUsageThreshold')}
                        brandColor={brandColor}
                      />
                    </div>
                    {merged.notifyOnUsageThreshold && (
                      <div className="flex items-center gap-3 pl-4 border-l-2 mt-2" style={{ borderColor: brandColor + '40' }}>
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
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" style={{ color: brandColor }} />
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
                    <p className="text-xs text-muted-foreground mt-1.5">Invoices, receipts, and payment alerts are sent here.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Branding info — shown on all tabs as a subtle footer */}
            {!brandingLoading && tenant && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/30 border border-border/50">
                <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground flex-1">
                  Brand theme for <strong>{tenant.name}</strong> ({tenant.slug}) is loaded from your auth profile.
                </p>
                <div className="h-5 w-10 rounded-md border" style={{ backgroundColor: brandColor }} />
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {hasPendingChanges && (
                <span className="text-xs text-muted-foreground">Unsaved changes</span>
              )}
              <Button
                onClick={() => mutation.mutate(merged)}
                disabled={mutation.isPending}
                className="min-w-[120px] font-semibold shadow-sm"
                style={{ backgroundColor: brandColor, color: brandTextColor }}
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Integrations Section ──────────────────────────────────────────────────────

const AUTH_API_URL_DEFAULT = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexitsolutions.com';
const SUBS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://subscriptionsapi.codevertexitsolutions.com';

function IntegrationsSection() {
  const { tenant } = useTenantBranding();
  const brandColor = tenant?.primaryColor ?? '#722F5F';
  const brandTextColor = contrastColor(brandColor);

  const [authApiUrl, setAuthApiUrl] = useState(AUTH_API_URL_DEFAULT);
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [saving, setSaving] = useState(false);

  const testAuthConnection = async () => {
    setTestStatus('loading');
    try {
      const res = await fetch(`${authApiUrl}/healthz`);
      setTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  };

  const handleSave = async () => {
    if (!allowedOrigins.trim()) { toast.success('No changes to save'); return; }
    setSaving(true);
    try {
      await apiClient.put('/api/v1/admin/config/allowed_origins', {
        config_value: allowedOrigins,
        config_type: 'string',
      });
      toast.success('Integrations settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">S2S auth, service URLs, and CORS for the Subscriptions service.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">S2S Auth</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Auth-API URL</label>
            <div className="flex gap-3">
              <Input
                value={authApiUrl}
                onChange={(e) => setAuthApiUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={testAuthConnection}
                disabled={testStatus === 'loading'}
                style={{ backgroundColor: brandColor, color: brandTextColor }}
              >
                {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            {testStatus === 'ok' && <p className="text-xs text-green-600">Connection successful</p>}
            {testStatus === 'fail' && <p className="text-xs text-red-600">Connection failed</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subscriptions API URL (this service)</label>
            <Input value={SUBS_API_URL} readOnly className="opacity-60 cursor-not-allowed" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">CORS</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Allowed Origins</label>
            <Input
              placeholder="https://app.example.com, https://admin.example.com"
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of allowed CORS origins.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-semibold"
            style={{ backgroundColor: brandColor, color: brandTextColor }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? 'Saving...' : 'Save Integrations'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Root page: role-gated ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useMe();
  const { tenant } = useTenantBranding();
  const brandColor = tenant?.primaryColor ?? '#722F5F';
  const brandTextColor = contrastColor(brandColor);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const [tab, setTab] = useState<'configs' | 'integrations'>('configs');

  if (!isPlatformOwner) return <TenantSettingsView />;

  return (
    <div>
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage platform configuration and integrations.</p>
            </div>
          </div>
          <div className="flex gap-0.5">
            {([
              { id: 'configs', label: 'Service Configs' },
              { id: 'integrations', label: 'Integrations' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl border-b-2',
                  tab === t.id
                    ? 'bg-card/80 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40',
                )}
                style={tab === t.id ? { borderBottomColor: brandColor, color: brandColor } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tab === 'configs' ? <PlatformSettingsView /> : <IntegrationsSection />}
    </div>
  );
}
