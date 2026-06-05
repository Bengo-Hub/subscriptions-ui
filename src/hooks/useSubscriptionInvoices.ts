import {
  downloadSubscriptionInvoicePdf,
  generateSubscriptionInvoice,
  resendSubscriptionInvoice,
  saveBlob,
  type SubscriptionInvoice,
} from '@/lib/api/subscriptionInvoices';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Generate (or regenerate) and email a subscription invoice for a tenant. */
export function useGenerateInvoice() {
  return useMutation({
    mutationFn: ({ tenantId, force }: { tenantId: string; force?: boolean }) =>
      generateSubscriptionInvoice(tenantId, force),
    onSuccess: (res: SubscriptionInvoice) => {
      toast.success(
        res.skipped
          ? `Invoice ${res.invoice_number} already exists for this period`
          : `Invoice ${res.invoice_number} generated and emailed`
      );
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || 'Failed to generate invoice'),
  });
}

/** Re-email the latest subscription invoice. */
export function useResendInvoice() {
  return useMutation({
    mutationFn: ({ tenantId }: { tenantId: string }) => resendSubscriptionInvoice(tenantId),
    onSuccess: (res: SubscriptionInvoice) =>
      toast.success(`Invoice ${res.invoice_number} re-sent`),
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || 'Failed to resend invoice'),
  });
}

/** Download the latest subscription invoice PDF. */
export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async ({ tenantId, fileName }: { tenantId: string; fileName?: string }) => {
      const { blob, fileName: name } = await downloadSubscriptionInvoicePdf(
        tenantId,
        fileName || 'invoice.pdf'
      );
      saveBlob(blob, name);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || 'No invoice PDF available'),
  });
}
