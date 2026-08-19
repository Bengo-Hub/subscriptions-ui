'use client';

import { Card, CardContent } from '@/components/ui/base';
import { useEmailUsageSummary } from '@/hooks/useEmailHosting';
import { HardDrive, Loader2 } from 'lucide-react';

function formatBytes(n: number): string {
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Real per-mailbox storage usage (plan Part 2b/5, T4) — the Zoho "Storage
 * Usage Reports" analog, sourced from email-provisioner's live Stalwart
 * data via subscriptions-api's leak-safe usage-summary endpoint, not a
 * placeholder built from allocated quota alone.
 */
export function EmailHostingStorageUsage() {
  const { data: mailboxes = [], isLoading } = useEmailUsageSummary();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (mailboxes.length === 0) return null;

  const sorted = [...mailboxes].sort((a, b) => b.used_bytes - a.used_bytes);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <HardDrive className="h-4 w-4 text-primary" /> Storage usage
        </p>
        {sorted.map((m) => {
          const ratio = m.allocated_bytes > 0 ? Math.min(1, m.used_bytes / m.allocated_bytes) : 0;
          return (
            <div key={m.email}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{m.email}</span>
                <span>
                  {formatBytes(m.used_bytes)} / {formatBytes(m.allocated_bytes)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${ratio > 0.85 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
