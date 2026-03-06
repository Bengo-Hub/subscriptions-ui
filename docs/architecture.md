# Subscription UI — Architecture

## Overview

Next.js 14+ application (App Router) providing the admin interface for BengoBox subscription management. Purely a frontend — all data is fetched from `subscriptions-api`.

---

## Project Structure

```
subscriptions-ui/
├── src/
│   ├── app/                         # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout (auth provider, query client)
│   │   ├── page.tsx                 # Redirect to /subscriptions
│   │   ├── subscriptions/
│   │   │   ├── page.tsx             # Tenant subscription dashboard
│   │   │   ├── plans/
│   │   │   │   ├── page.tsx         # Plan catalog + comparison matrix
│   │   │   │   └── [code]/page.tsx  # Plan detail
│   │   │   ├── upgrade/page.tsx     # Plan change flow
│   │   │   ├── products/page.tsx    # Product subscriptions
│   │   │   └── usage/page.tsx       # Usage dashboard
│   │   └── admin/
│   │       ├── subscriptions/
│   │       │   ├── page.tsx         # All tenants table
│   │       │   └── [id]/page.tsx    # Tenant detail
│   │       ├── plans/
│   │       │   ├── page.tsx         # Plan CRUD list
│   │       │   └── [id]/edit/page.tsx
│   │       ├── bundles/page.tsx     # Bundle config
│   │       └── overrides/page.tsx   # Feature overrides
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── subscription/            # Subscription-specific components
│   │   │   ├── status-badge.tsx
│   │   │   ├── plan-card.tsx
│   │   │   ├── plan-comparison.tsx
│   │   │   ├── feature-list.tsx
│   │   │   ├── usage-meter.tsx
│   │   │   └── trial-countdown.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── lib/
│   │   ├── api/                     # Typed API client
│   │   │   ├── client.ts            # Base fetch wrapper with auth
│   │   │   ├── subscriptions.ts     # Subscription endpoints
│   │   │   ├── plans.ts             # Plan endpoints
│   │   │   └── products.ts          # Product endpoints
│   │   ├── auth/                    # Auth provider (shared-auth-client JS)
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── use-subscription.ts
│   │   │   ├── use-plans.ts
│   │   │   └── use-feature-check.ts
│   │   └── types/                   # Shared TypeScript types
│   │       ├── subscription.ts
│   │       ├── plan.ts
│   │       └── product.ts
│   └── styles/
│       └── globals.css              # Tailwind base + theme tokens
├── public/
├── docs/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

---

## Key Architectural Decisions

### 1. Server Components by Default

Pages fetch data via RSC (React Server Components) using the typed API client. Interactive elements (modals, forms, plan selector) are Client Components marked with `"use client"`.

### 2. TanStack Query for Client-Side State

Mutations (create subscription, change plan) use `useMutation` with optimistic updates. Query invalidation on mutation success ensures fresh data.

```typescript
const { mutate: changePlan } = useMutation({
  mutationFn: (planCode: string) => api.subscriptions.changePlan(tenantId, planCode),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription', tenantId] }),
});
```

### 3. Role-Based Route Protection

Two route groups:
- `/subscriptions/*` — Tenant admin (any authenticated user with a tenant)
- `/admin/*` — Platform admin only (role: `platform_admin`)

Middleware checks JWT claims for `roles` array. Unauthorized users are redirected to their appropriate dashboard.

### 4. API Client Pattern

Typed fetch wrapper that automatically includes auth headers:

```typescript
// lib/api/client.ts
async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### 5. Design System

shadcn/ui components + Tailwind CSS. Key component patterns:

- **Plan Card**: Tier name, price, feature list, CTA button
- **Status Badge**: Color-coded subscription status (green=active, yellow=trial, red=expired)
- **Usage Meter**: Progress bar showing current usage vs plan limit
- **Trial Countdown**: Days remaining with visual urgency at <3 days
- **Feature List**: Check/cross icons for plan comparison

---

## Auth Flow

1. User navigates to subscriptions-ui
2. `shared-auth-client` JS SDK checks for valid session
3. If no session → redirect to `sso.codevertexitsolutions.com/login?redirect=...`
4. After SSO login → redirect back with JWT
5. SDK stores token, extracts `tenant_id` and `roles` from claims
6. App routes based on role (platform admin → admin routes, tenant admin → tenant routes)

---

## Data Flow

```
subscriptions-ui (Next.js)
    │
    ├── RSC data fetching (server-side)
    │   └── GET /plans, GET /tenants/{id}/subscription
    │
    ├── Client mutations (TanStack Query)
    │   └── POST/PUT to subscriptions-api
    │
    └── Auth
        └── shared-auth-client → sso.codevertexitsolutions.com
```

The UI is a thin presentation layer. All business logic (state transitions, validation, feature gating) lives in `subscriptions-api`.
