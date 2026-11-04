'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';

type Switch = 'inherit' | 'on' | 'off';

interface SetupFeePolicy {
  enabled: boolean;
  source: 'tenant' | 'platform' | 'default';
  platform: boolean | null;
  tenant: boolean | null;
}

const SOURCE_LABEL: Record<SetupFeePolicy['source'], string> = {
  tenant: 'this tenant',
  platform: 'platform setting',
  default: 'default',
};

/**
 * Whether one tenant is charged the one-time setup fee. The fee only ever applies to the tenant's
 * first paid period, so switching it on later never bills a tenant that has already paid.
 */
export function SetupFeeTenantPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const path = `/api/v1/admin/tenants/${tenantId}/setup-fee/policy`;
  const queryKey = ['admin-tenant-setup-fee', tenantId];
  const { data } = useQuery({ queryKey, queryFn: () => apiClient.get<SetupFeePolicy>(path), enabled: !!tenantId });

  const [sw, setSw] = useState<Switch>('inherit');
  useEffect(() => {
    if (data) setSw(data.tenant == null ? 'inherit' : data.tenant ? 'on' : 'off');
  }, [data]);

  const save = useMutation({
    mutationFn: (enabled: boolean | null) => apiClient.put<SetupFeePolicy>(path, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Setup fee setting saved');
    },
    onError: () => toast.error('Could not save the setup fee setting'),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Setup fee</h2>
          {data && <Badge variant={data.enabled ? 'success' : 'outline'}>{data.enabled ? 'Charged' : 'Not charged'}</Badge>}
        </div>
        {data && <p className="text-xs text-muted-foreground mt-1">Set by {SOURCE_LABEL[data.source]}. Charged once, on the first paid period only.</p>}
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label htmlFor="tenant-setup-fee-switch" className="text-xs text-muted-foreground">Setup fee for this tenant</label>
            <select
              id="tenant-setup-fee-switch"
              value={sw}
              onChange={(e) => setSw(e.target.value as Switch)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="inherit">Follow platform setting</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(sw === 'inherit' ? null : sw === 'on')}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
