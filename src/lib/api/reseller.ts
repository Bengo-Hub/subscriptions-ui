// Certified Reseller & Partner Program — self-service portal API client.
//
// Unlike this app's own subscriptions-api calls (billing.ts, plans.ts, etc., via the shared
// `apiClient`), the reseller portal's data lives on auth-api (own status, own clients) and
// treasury-api (own commission) — two OTHER services. Mirrors the exact direct-fetch +
// Bearer-token convention lib/auth/api.ts already uses for auth-api calls (fetchProfile),
// rather than routing through the subscriptions-api-scoped apiClient.
const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';
const TREASURY_API_URL = process.env.NEXT_PUBLIC_TREASURY_API_URL || 'https://booksapi.codevertexafrica.com';

export interface ResellerStatus {
  tenant_id: string;
  is_reseller: true;
  requested_tier?: string;
  business_name?: string;
  application_id?: string;
  agreement_acceptance_id?: string;
}

export interface ResellerClient {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  contact_email?: string;
}

export interface ResellerCommissionSummary {
  has_commission_record: boolean;
  holder_id?: string;
  percentage_share?: number;
  compensation_model?: string;
  payout_tax_treatment?: string;
  payout_frequency?: string;
  is_active?: boolean;
  linked_client_count?: number;
}

/** Thrown when a call succeeds at the network level but the response isn't 2xx — callers
 *  distinguish status (e.g. 403 "not a reseller") from a generic network/server failure. */
export class ResellerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJSON<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ResellerApiError(response.status, body?.message || body?.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export const getOwnResellerStatus = (accessToken: string) =>
  getJSON<ResellerStatus>(`${SSO_BASE_URL}/api/v1/reseller/me`, accessToken);

export const getOwnResellerClients = (accessToken: string) =>
  getJSON<{ clients: ResellerClient[] }>(`${SSO_BASE_URL}/api/v1/reseller/clients`, accessToken);

export const getOwnResellerCommission = (accessToken: string) =>
  getJSON<ResellerCommissionSummary>(`${TREASURY_API_URL}/api/v1/reseller/commission`, accessToken);
