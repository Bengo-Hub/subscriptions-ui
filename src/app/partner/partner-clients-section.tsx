'use client';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/base';
import { useResellerClients } from '@/hooks/useResellerPortal';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  active: 'success',
  pending_approval: 'warning',
  suspended: 'error',
  inactive: 'outline',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// My Clients — tenants this reseller is the commercial channel of record for
// (Tenant.managed_by_reseller_tenant_id, GET /api/v1/reseller/clients on auth-api). Read-only:
// per the plan's §6A access-boundary rule, this list grants no visibility into any of these
// tenants' own operational data (POS sales, inventory, financials) — commercial/billing scope
// only. Onboarding a new client (linking a tenant here) is not built yet — see the plan's
// register item N6.
export function PartnerClientsSection() {
  const { data, isLoading, isError } = useResellerClients();
  const clients = data?.clients ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">My Clients ({clients.length})</h2>
        <p className="text-sm text-muted-foreground">
          Businesses you're the certified reseller of record for.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load your clients. Please try again.</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No clients yet. Onboarding a new client is coming soon.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
