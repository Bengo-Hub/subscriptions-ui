'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TenantSubscription {
  id: string;
  tenantSlug: string;
  tenantName: string;
  planName: string;
  planTier: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  startDate: string;
  currentPeriodEnd: string;
  monthlyRevenue: number;
  currency: string;
}

interface PaginatedResponse {
  data: TenantSubscription[];
  total: number;
  page: number;
  pageSize: number;
}

export default function PlatformSubscriptionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user && !isPlatformOwner) router.replace('/');
  }, [user, isPlatformOwner, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-subscriptions', page, search, statusFilter],
    queryFn: () =>
      apiClient.get<PaginatedResponse>('/api/v1/admin/subscriptions', {
        page,
        pageSize: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!isPlatformOwner,
  });

  const statusVariant = (s: string) => {
    switch (s) {
      case 'active': return 'success' as const;
      case 'trialing': return 'default' as const;
      case 'past_due': return 'warning' as const;
      case 'canceled':
      case 'expired': return 'error' as const;
      default: return 'outline' as const;
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const formatCurrency = (amount?: number, currency = 'USD') =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount) : '—';

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Subscriptions</h1>
        <p className="text-muted-foreground mt-1">View and manage subscriptions across all tenants.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tenants..."
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tenant Subscriptions</h2>
            </div>
            {data && (
              <span className="text-sm text-muted-foreground">{data.total} total</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.data?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Renews</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{sub.tenantSlug}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{sub.planName}</TableCell>
                      <TableCell className="capitalize">{sub.planTier}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(sub.startDate)}</TableCell>
                      <TableCell>{formatDate(sub.currentPeriodEnd)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(sub.monthlyRevenue, sub.currency)}/mo
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search ? 'No subscriptions match your search.' : 'No subscriptions found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
