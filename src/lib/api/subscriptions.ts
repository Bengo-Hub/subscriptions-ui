import { apiClient } from './client'
import type { Subscription, SubscriptionSettings } from '@/types/subscription'

export const getSubscription = () =>
  apiClient.get<Subscription>('/api/v1/subscription')

export const getSubscriptionByTenantId = (tenantId: string) =>
  apiClient.get<Subscription>(`/api/v1/tenants/${tenantId}/subscription`)

export const getSettings = () =>
  apiClient.get<SubscriptionSettings>('/api/v1/subscription/settings')

export const updateSettings = (settings: Partial<SubscriptionSettings>) =>
  apiClient.put<{ status: string }>('/api/v1/subscription/settings', settings)

export const initiateSubscription = (planCode: string, returnUrl?: string, billingCycle?: string) =>
  apiClient.post<{ intent_id: string; status: string; amount: string; currency: string; initiate_url?: string; authorization_url?: string }>(
    '/api/v1/subscription/initiate',
    { plan_code: planCode, return_url: returnUrl, billing_cycle: billingCycle },
  )

// Current subscription Terms & Conditions (version + markdown text) shown in the subscribe flow.
export const getTerms = () =>
  apiClient.get<{ version: string; content: string }>('/api/v1/terms')

export const createSubscription = (
  planCode: string,
  opts?: { bundleCode?: string; termsVersion?: string; termsAccepted?: boolean; billingCycle?: string },
) =>
  apiClient.post<Subscription>('/api/v1/subscription', {
    plan_code: planCode,
    bundle_code: opts?.bundleCode,
    // T&C acceptance is required server-side for tenant self-serve subscribes.
    terms_version: opts?.termsVersion,
    terms_accepted: opts?.termsAccepted,
    // Chosen billing period (MONTHLY/SEMI_ANNUAL/ANNUAL); 6+ months waives the setup fee.
    billing_cycle: opts?.billingCycle,
  })

/**
 * What POST /subscription answers when it attaches another service's plan as an add-on: the
 * subscription, and for a paid add-on outside a trial something to pay, either a payment intent
 * (the /subscription/initiate shape) or an invoice that then shows on the billing page.
 */
export interface AddOnResult {
  intent_id?: string
  initiate_url?: string
  authorization_url?: string
  amount?: string | number
  currency?: string
  invoice_id?: string
  invoice_number?: string
  amount_due?: number
  invoice?: { id?: string; invoice_number?: string; amount_due?: number; total?: number } | null
}

/** Attaches a plan of another service to the main plan (co-terminous add-on). Same POST as a first subscribe. */
export const addPlanToSubscription = (planCode: string, terms: { version: string }) =>
  apiClient.post<AddOnResult>('/api/v1/subscription', {
    plan_code: planCode,
    terms_version: terms.version,
    terms_accepted: true,
  })

/** Removes an add-on at the end of the current period (it stays on until then). */
export const removeAddOn = (productCode: string) =>
  apiClient.delete<unknown>(`/api/v1/subscription/add-ons/${encodeURIComponent(productCode)}`)

// Switch the billing period (MONTHLY/SEMI_ANNUAL/ANNUAL) effective next renewal.
// 6+ month periods waive the one-time setup fee if it has not been charged yet.
export const updateBillingCycle = (billingCycle: string) =>
  apiClient.put<Subscription>('/api/v1/subscription/billing-cycle', {
    billing_cycle: billingCycle,
  })

export const changePlan = (newPlanCode: string, billingCycle?: string) =>
  apiClient.put<Subscription>('/api/v1/subscription/plan', {
    new_plan_code: newPlanCode,
    billing_cycle: billingCycle,
  })

export const extendTrial = (tenantId: string, trialEndsAt: string) =>
  apiClient.post<{ status: string; trial_ends_at: string }>(
    `/api/v1/admin/tenants/${tenantId}/subscription/extend-trial`,
    { trial_ends_at: trialEndsAt },
  )

export const listExpiring = (days?: number) =>
  apiClient.get<Subscription[]>('/api/v1/subscriptions/expiring', days ? { days } : undefined)
