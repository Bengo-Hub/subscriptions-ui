'use client';

import { useState } from 'react';
import { Globe, Link2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import { apiClient } from '@/lib/api/client';
import { SERVICE_CONFIGS_KEY, useServiceConfigs } from '@/components/settings/PlatformConfigsView';

const AUTH_API_URL_DEFAULT = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexafrica.com';
const SUBS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pricingapi.codevertexafrica.com';

/** S2S auth check and CORS origins for the subscriptions service (platform owners only). */
export function IntegrationsSection() {
  const qc = useQueryClient();
  const { data } = useServiceConfigs();
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

  const save = async () => {
    if (!allowedOrigins.trim()) {
      toast.info('Nothing to save');
      return;
    }
    setSaving(true);
    try {
      const existing = (data?.data ?? []).find((c) => c.configKey === 'allowed_origins');
      if (existing) {
        await apiClient.put(`/api/v1/admin/configs/${existing.id}`, { configValue: allowedOrigins, configType: 'string' });
      } else {
        await apiClient.post('/api/v1/admin/configs', {
          configKey: 'allowed_origins',
          configValue: allowedOrigins,
          configType: 'string',
          description: 'Allowed CORS origins (comma-separated)',
          isSecret: false,
        });
      }
      qc.invalidateQueries({ queryKey: SERVICE_CONFIGS_KEY });
      toast.success('Integration settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Service-to-service auth" icon={Link2}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="int-auth-url" className="text-sm font-medium">
              Auth API URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="int-auth-url" value={authApiUrl} onChange={(e) => setAuthApiUrl(e.target.value)} className="flex-1" />
              <Button type="button" onClick={testAuthConnection} disabled={testStatus === 'loading'}>
                {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test connection'}
              </Button>
            </div>
            <p role="status" className="text-xs">
              {testStatus === 'ok' && <span className="text-green-700 dark:text-green-400">Connected</span>}
              {testStatus === 'fail' && <span className="text-red-700 dark:text-red-400">Could not connect</span>}
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="int-subs-url" className="text-sm font-medium">
              Subscriptions API URL (this service)
            </label>
            <Input id="int-subs-url" value={SUBS_API_URL} readOnly className="cursor-not-allowed opacity-70" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="CORS" icon={Globe}>
        <div className="space-y-3">
          <label htmlFor="int-origins" className="text-sm font-medium">
            Allowed origins
          </label>
          <Input id="int-origins" placeholder="https://app.example.com, https://admin.example.com" value={allowedOrigins} onChange={(e) => setAllowedOrigins(e.target.value)} />
          <p className="text-xs text-muted-foreground">Comma-separated.</p>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
