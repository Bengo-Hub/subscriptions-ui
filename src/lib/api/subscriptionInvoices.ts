import { apiClient } from '@/lib/api/client';

export interface SubscriptionInvoice {
  invoice_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  pay_url: string;
  pdf_url: string;
  skipped?: boolean;
}

const base = (tenantId: string) => `/api/v1/admin/tenants/${tenantId}/subscription`;

/** Latest subscription invoice summary for a tenant (null if none yet). */
export const getSubscriptionInvoice = (tenantId: string) =>
  apiClient.get<SubscriptionInvoice | { invoice: null }>(`${base(tenantId)}/invoice`);

/** Generate (or, with force, regenerate) and email a subscription invoice. */
export const generateSubscriptionInvoice = (tenantId: string, force = false) =>
  apiClient.post<SubscriptionInvoice>(`${base(tenantId)}/generate-invoice${force ? '?force=true' : ''}`);

/** Re-email the latest subscription invoice (no new invoice created). */
export const resendSubscriptionInvoice = (tenantId: string) =>
  apiClient.post<SubscriptionInvoice>(`${base(tenantId)}/invoice/resend`);

/** Download the latest subscription invoice PDF as a Blob (proxied via subscriptions-api). */
export const downloadSubscriptionInvoicePdf = (tenantId: string, fallbackName = 'invoice.pdf') =>
  apiClient.getBlob(`${base(tenantId)}/invoice/pdf?download=true`, fallbackName);

/** Trigger a browser download of a Blob. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
