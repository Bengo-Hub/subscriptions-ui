'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { useSaveUpgradeTrialSettings, useUpgradeTrialSettings } from '@/hooks/useUpgradeTrial';

/**
 * Platform-wide upgrade trial switch and length. A tenant with its own setting (tenant detail
 * page) keeps it; every other tenant follows this one.
 */
export function UpgradeTrialSettingsCard() {
  const { data, isLoading } = useUpgradeTrialSettings();
  const save = useSaveUpgradeTrialSettings();
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState('14');

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setDays(String(data.days));
  }, [data]);

  const max = data?.max_days ?? 90;
  const n = Number(days);
  const valid = Number.isInteger(n) && n >= 1 && n <= max;
  const dirty = !!data && (enabled !== data.enabled || n !== data.days);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Upgrade trials</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Lets a tenant try a higher tier of its current product free for the set number of days. The tenant keeps paying
          for its current plan during the trial; afterwards the upgrade takes effect on its next renewal date and that
          renewal is billed at the new price. Each tenant can try each plan once. Per-tenant settings on the tenant page
          override this one.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 rounded-lg bg-muted animate-pulse" />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex items-center gap-2 cursor-pointer select-none h-9">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded" />
              <span className="text-sm font-medium">Offer upgrade trials to every tenant</span>
            </label>
            <div className="space-y-1">
              <label htmlFor="upgrade-trial-days" className="text-xs text-muted-foreground">Trial length (days, 1 to {max})</label>
              <Input
                id="upgrade-trial-days"
                type="number"
                min={1}
                max={max}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-9 rounded-lg w-32"
                aria-invalid={!valid}
              />
            </div>
            <Button size="sm" className="h-9" disabled={!valid || !dirty || save.isPending} onClick={() => save.mutate({ enabled, days: n })}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
