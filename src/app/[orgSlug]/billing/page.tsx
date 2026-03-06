'use client';

import {
  Badge,
  Button,
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
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, Download, Receipt } from 'lucide-react';
import { useParams } from 'next/navigation';

interface PaymentMethod {
  type: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'void';
  description: string;
  pdfUrl?: string;
}

interface BillingInfo {
  paymentMethod: PaymentMethod | null;
  nextRenewalDate: string;
  nextAmount: number;
  currency: string;
  invoices: Invoice[];
}

export default function BillingPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const { data, isLoading } = useQuery({
    queryKey: ['billing', orgSlug],
    queryFn: () => apiClient.get<BillingInfo>(`/api/v1/tenants/${orgSlug}/billing`),
  });

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const formatCurrency = (amount?: number, currency = 'USD') =>
    amount != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
      : '—';

  const invoiceStatusVariant = (s: string) => {
    switch (s) {
      case 'paid': return 'success' as const;
      case 'pending': return 'warning' as const;
      case 'failed': return 'error' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage payment methods, view invoices, and track renewals.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Payment Method</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              </div>
            ) : data?.paymentMethod ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center text-xs font-bold uppercase">
                    {data.paymentMethod.brand}
                  </div>
                  <div>
                    <p className="font-medium text-sm">&bull;&bull;&bull;&bull; {data.paymentMethod.last4}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {data.paymentMethod.expiryMonth}/{data.paymentMethod.expiryYear}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update Card</Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No payment method on file</p>
                <Button size="sm">Add Payment Method</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Renewal */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Next Renewal</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-44 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-bold">{formatCurrency(data?.nextAmount, data?.currency)}</p>
                <p className="text-sm text-muted-foreground">
                  Due on {formatDate(data?.nextRenewalDate)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Invoice History</h2>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.invoices?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{formatDate(inv.date)}</TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No invoices yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
