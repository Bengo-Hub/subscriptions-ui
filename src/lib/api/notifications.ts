// notifications-api client — used sparingly, only for the few things that live on that OTHER
// service and have no equivalent in this app's own subscriptions-api. Mirrors the direct-fetch
// convention lib/api/reseller.ts already uses for cross-service calls (SSO/treasury).
const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'https://notificationsapi.codevertexafrica.com';

export interface WhatsAppPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  provider_cost: number;
  messages_per_month: number;
  is_active: boolean;
}

/** GET /api/v1/billing/whatsapp/plans — public, no auth required. */
export async function listWhatsAppPlans(): Promise<WhatsAppPlan[]> {
  const response = await fetch(`${NOTIFICATIONS_API_URL}/api/v1/billing/whatsapp/plans`);
  if (!response.ok) {
    throw new Error(`Failed to load WhatsApp plans (${response.status})`);
  }
  const body = await response.json();
  return body?.data ?? [];
}
