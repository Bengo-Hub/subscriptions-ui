# Subscription UI — Integrations

## Overview

The Subscription UI integrates with two backend services:

1. **subscriptions-api** — All subscription data (plans, features, subscriptions, products, usage)
2. **auth-service (SSO)** — Authentication, session management, JWT tokens

The UI makes no direct database connections. All data flows through REST APIs.

---

## Subscription API Integration

**Base URL**: `https://pricingapi.codevertexitsolutions.com/api/v1`
**Local**: `http://localhost:4005/api/v1`

### Endpoints Used

#### Tenant-Scoped (Tenant Admin)

| Endpoint | Method | UI Page | Purpose |
|----------|--------|---------|---------|
| `/tenants/{tenant_id}/subscription` | GET | Dashboard | Current subscription status, features, limits |
| `/tenants/{tenant_id}/features/{code}/check` | GET | Feature gate | Real-time feature availability |
| `/tenants/{tenant_id}/subscription` | POST | Create | Provision new subscription |
| `/tenants/{tenant_id}/subscription/plan` | PUT | Upgrade | Change plan |
| `/tenants/{tenant_id}/subscription/cancel` | POST | Cancel | Cancel subscription |
| `/tenants/{tenant_id}/subscription/renew` | POST | Renew | Renew subscription |
| `/tenants/{tenant_id}/products` | GET | Products | List active product subscriptions |
| `/tenants/{tenant_id}/products/{code}/activate` | POST | Products | Enable product |
| `/tenants/{tenant_id}/products/{code}/deactivate` | POST | Products | Disable product |

#### Public/Catalog

| Endpoint | Method | UI Page | Purpose |
|----------|--------|---------|---------|
| `/plans` | GET | Plan catalog | All available plans with features |
| `/plans/code/{code}` | GET | Plan detail | Single plan details |

#### Platform Admin (Future — Sprint 3 of API)

| Endpoint | Method | UI Page | Purpose |
|----------|--------|---------|---------|
| `/admin/plans` | POST | Plan management | Create plan |
| `/admin/plans/{id}` | PUT | Plan management | Update plan |
| `/admin/tenants` | GET | All subscriptions | List all tenant subscriptions |
| `/admin/tenants/{id}/subscription/override` | POST | Overrides | Manual feature override |

### API Client Implementation

Typed fetch wrapper in `lib/api/client.ts`:

```typescript
interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string>;
}

class SubscriptionApiClient {
  constructor(private config: ApiClientConfig) {}

  async getSubscription(tenantId: string): Promise<TenantSubscription> {
    return this.get(`/tenants/${tenantId}/subscription`);
  }

  async changePlan(tenantId: string, planCode: string): Promise<SubscriptionResult> {
    return this.put(`/tenants/${tenantId}/subscription/plan`, { plan_code: planCode });
  }

  async listPlans(): Promise<Plan[]> {
    return this.get('/plans');
  }

  // ...
}
```

### TanStack Query Keys

Consistent query key structure for cache management:

```typescript
const queryKeys = {
  subscription: (tenantId: string) => ['subscription', tenantId] as const,
  plans: () => ['plans'] as const,
  plan: (code: string) => ['plans', code] as const,
  products: (tenantId: string) => ['products', tenantId] as const,
  feature: (tenantId: string, code: string) => ['feature', tenantId, code] as const,
};
```

### Error Handling

API errors follow the format `{ "error": "message" }`. The client maps HTTP status codes:

| Status | UI Behavior |
|--------|-------------|
| 401 | Redirect to SSO login |
| 402 | Show upgrade prompt |
| 404 | "Subscription not found" — prompt to create |
| 409 | "Already subscribed" — show current status |
| 500 | Generic error toast with retry button |

---

## Auth Service Integration

**SSO URL**: `https://sso.codevertexitsolutions.com`

### Authentication Flow

1. **Page Load**: Check for valid JWT in cookie/storage via `shared-auth-client` JS SDK
2. **No Token**: Redirect to `{SSO_URL}/login?redirect={APP_URL}`
3. **Token Present**: Decode JWT, extract `tenant_id`, `roles`, `subscription_features`
4. **Token Expired**: Silent refresh via `{SSO_URL}/api/v1/token/refresh`

### JWT Claims Used by UI

```typescript
interface JWTClaims {
  sub: string;           // user ID
  tenant_id: string;     // tenant UUID
  email: string;
  roles: string[];       // ["admin", "platform_admin", ...]
  subscription_features: string[];
  subscription_limits: Record<string, number>;
  subscription_status: string;
  subscription_plan: string;
}
```

The UI uses these claims for:
- **Routing**: `platform_admin` role → show admin sidebar items
- **Feature gating in UI**: Hide UI elements for features not in `subscription_features`
- **Display**: Show plan name, status badge from claims without extra API call

### Auth Provider Setup

```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/auth/provider';

export default function RootLayout({ children }) {
  return (
    <AuthProvider
      ssoUrl={process.env.NEXT_PUBLIC_AUTH_URL!}
      appUrl={process.env.NEXT_PUBLIC_APP_URL!}
    >
      {children}
    </AuthProvider>
  );
}
```

---

## Environment Configuration

```env
# Subscription API
NEXT_PUBLIC_SUBSCRIPTION_API_URL=https://pricingapi.codevertexitsolutions.com/api/v1

# Auth / SSO
NEXT_PUBLIC_AUTH_URL=https://sso.codevertexitsolutions.com

# App
NEXT_PUBLIC_APP_URL=https://subscriptions.codevertexitsolutions.com
```

Local development:
```env
NEXT_PUBLIC_SUBSCRIPTION_API_URL=http://localhost:4005/api/v1
NEXT_PUBLIC_AUTH_URL=https://auth.codevertex.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## CORS

The subscriptions-api allows CORS from configured origins. Ensure the UI domain is listed in the API's `HTTP_ALLOWED_ORIGINS` config:

```
HTTP_ALLOWED_ORIGINS=https://subscriptions.codevertexitsolutions.com,http://localhost:3000
```

---

## Data Freshness Strategy

| Data | Fetch Strategy | Cache TTL |
|------|----------------|-----------|
| Plan catalog | RSC (server fetch) | 5 minutes (revalidate) |
| Tenant subscription | TanStack Query | 30 seconds (staleTime) |
| Feature checks | TanStack Query | 60 seconds |
| Products list | TanStack Query | 30 seconds |
| Usage metrics | TanStack Query | 60 seconds |

Mutations (plan change, cancel, etc.) immediately invalidate related queries.
