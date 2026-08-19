import { apiClient } from './client'

// Mirrors addons.ts's pattern exactly — tenant self-service email-hosting
// license/domain management (plan Part 3), calling subscriptions-api's
// /api/v1/email/* endpoints directly (tenant-JWT-scoped, resolved server-side
// from the apiClient's Authorization header, same as every other tenant call
// in this app).

export interface EmailPlan {
  id: string
  code: string
  name: string
  description: string
  price_per_user_monthly: number
  price_per_user_yearly: number
  storage_per_user_gb: number
  max_aliases: number
  max_email_size_mb: number
  features_json: Record<string, unknown>
  is_active: boolean
  is_public: boolean
  sort_order: number
}

export type EmailLicenseStatus = 'AVAILABLE' | 'ASSIGNED' | 'SUSPENDED' | 'EXPIRED' | 'DELETED'

export interface EmailLicense {
  id: string
  tenant_subscription_id: string
  product_subscription_id: string
  email_plan_id: string
  assigned_to_email?: string | null
  status: EmailLicenseStatus
  suspend_reason?: string | null
  storage_quota_gb: number
  edges?: { email_plan?: EmailPlan }
}

export type EmailDomainStatus = 'PENDING_DNS' | 'VERIFIED' | 'FAILED'

export interface EmailDomain {
  id: string
  domain: string
  status: EmailDomainStatus
  dkim_selector?: string | null
  verified_at?: string | null
  last_checked_at?: string | null
  failure_reason?: string | null
  metadata?: { dns_zone_file?: string }
}

export const listEmailPlans = () => apiClient.get<EmailPlan[]>('/api/v1/email/plans')

export const listEmailLicenses = () => apiClient.get<EmailLicense[]>('/api/v1/email/licenses')

export const purchaseEmailLicenses = (planCode: string, quantity: number, returnUrl?: string) =>
  apiClient.post<{ status: string; plan_code: string; quantity: number; intent?: Record<string, any> }>(
    '/api/v1/email/licenses/purchase',
    { plan_code: planCode, quantity, return_url: returnUrl },
  )

export const assignEmailLicense = (licenseId: string, email: string, notifyEmail?: string) =>
  apiClient.put<EmailLicense>(`/api/v1/email/licenses/${licenseId}/assign`, { email, notify_email: notifyEmail })

export const unassignEmailLicense = (licenseId: string) =>
  apiClient.put<EmailLicense>(`/api/v1/email/licenses/${licenseId}/unassign`, {})

export const upgradeEmailLicense = (licenseId: string, planCode: string) =>
  apiClient.put<EmailLicense>(`/api/v1/email/licenses/${licenseId}/upgrade`, { plan_code: planCode })

export const suspendEmailLicense = (licenseId: string, reason?: string) =>
  apiClient.put<EmailLicense>(`/api/v1/email/licenses/${licenseId}/suspend`, { reason })

export interface MailboxUsage {
  email: string
  used_bytes: number
  allocated_bytes: number
}

export const getEmailUsageSummary = () => apiClient.get<MailboxUsage[]>('/api/v1/email/usage-summary')

export const listEmailDomains = () => apiClient.get<EmailDomain[]>('/api/v1/email/domains')

export const createEmailDomain = (domain: string) =>
  apiClient.post<EmailDomain>('/api/v1/email/domains', { domain })

export const verifyEmailDomain = (domainId: string) =>
  apiClient.post<EmailDomain>(`/api/v1/email/domains/${domainId}/verify`, {})
