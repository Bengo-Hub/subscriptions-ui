# Subscription UI — Implementation Plan

## Purpose

Admin interface for the BengoBox Subscription Service. Serves two audiences:

1. **Platform Admins** (Codevertex staff) — Manage plans, bundles, products, view all tenant subscriptions, override features, monitor usage across the platform
2. **Tenant Admins** (Restaurant owners) — View their subscription status, see usage, upgrade/downgrade plans, manage product add-ons

**MVP Deadline**: March 17, 2026

---

## Technology Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, RSC, file-based routing — consistent with other BengoBox UIs |
| Language | TypeScript | Type safety across API contracts |
| UI Library | shadcn/ui + Tailwind CSS | Consistent design system, accessible components |
| State | TanStack Query (React Query) | Server-state caching, optimistic updates |
| Auth | `shared-auth-client` (JS SDK) + useMe (TanStack Query) | SSO integration; GET /me from auth-api with 5 min TTL; `hasRole`/`hasPermission` for permission-based nav and route protection; 403 → `/[orgSlug]/unauthorized`, 404 → `not-found.tsx`; data fetches via TanStack Query |
| HTTP Client | Fetch API + typed wrappers | No extra dependency; typed request/response |
| Package Manager | pnpm | Monorepo friendly, fast installs |
| Testing | Vitest + Playwright | Unit + E2E |

---

## Scope for MVP (March 17)

### Must Have

- Plan catalog display (pricing table with feature comparison)
- Tenant subscription status page (current plan, status, trial countdown, features, limits)
- Plan upgrade/downgrade flow (with confirmation)
- Product subscriptions list (active products)
- Platform admin: list all tenant subscriptions
- Platform admin: manual subscription creation for a tenant

### Should Have

- Usage dashboard (current period metrics vs limits)
- Feature override panel (platform admin)
- Plan management CRUD (platform admin)
- Bundle configuration view

### Out of Scope for MVP

- Billing/invoice views (treasury-service responsibility)
- Self-service cancellation (available via API, not prioritized for UI)
- Usage forecasting charts
- Custom plan builder

---

## Page Structure

```
/                              → Redirect to /subscriptions
/subscriptions                 → Tenant subscription dashboard
/subscriptions/plans           → Plan catalog + comparison
/subscriptions/plans/[code]    → Plan detail
/subscriptions/upgrade         → Plan change flow
/subscriptions/products        → Product subscriptions
/subscriptions/usage           → Usage dashboard

/admin/subscriptions           → All tenant subscriptions table
/admin/subscriptions/[id]      → Tenant subscription detail
/admin/plans                   → Plan management CRUD
/admin/plans/[id]/edit         → Edit plan
/admin/bundles                 → Bundle configuration
/admin/overrides               → Feature override management
```

---

## API Dependencies

All data comes from `subscriptions-api` at `https://pricingapi.codevertexitsolutions.com/api/v1`.

| UI Page | API Endpoint | Method |
|---------|-------------|--------|
| Subscription status | `/tenants/{tenant_id}/subscription` | GET |
| Feature check | `/tenants/{tenant_id}/features/{code}/check` | GET |
| Plan catalog | `/plans` | GET |
| Plan detail | `/plans/code/{code}` | GET |
| Create subscription | `/tenants/{tenant_id}/subscription` | POST |
| Change plan | `/tenants/{tenant_id}/subscription/plan` | PUT |
| Cancel | `/tenants/{tenant_id}/subscription/cancel` | POST |
| Renew | `/tenants/{tenant_id}/subscription/renew` | POST |
| Product list | `/tenants/{tenant_id}/products` | GET |
| Activate product | `/tenants/{tenant_id}/products/{code}/activate` | POST |
| Deactivate product | `/tenants/{tenant_id}/products/{code}/deactivate` | POST |

---

## Environment Variables

```env
NEXT_PUBLIC_SUBSCRIPTION_API_URL=https://pricingapi.codevertexitsolutions.com/api/v1
NEXT_PUBLIC_AUTH_URL=https://sso.codevertexitsolutions.com
NEXT_PUBLIC_APP_URL=https://subscriptions.codevertexitsolutions.com
```

---

## Sprint Plan

| Sprint | Focus | Dates |
|--------|-------|-------|
| 1 | Foundation: scaffolding, auth, plan catalog, subscription status | Mar 7–14 |
| 2 | Admin panels, usage dashboard, product management | Mar 14–17 (overlap/polish) |

See `docs/sprints/` for detailed sprint plans.

---

## Auth & RBAC (verified)

- **useMe** (`src/hooks/useMe.ts`): TanStack Query with 5 min `staleTime`/`gcTime`; fetches auth-api GET /me; exposes `user`, `hasRole(role)`, `hasPermission(permission)`.
- **Permission-based nav:** Sidebar uses `hasRole('admin'|'super_admin')` for Platform section (Plans Management, All Subscriptions). Use `hasPermission` for resource-scoped nav when auth-api permissions are wired (e.g. `subscription.read`, `plan.manage`).
- **Route protection:** `AuthProvider` redirects unauthenticated users to SSO; on 403 from /me redirects to `/[orgSlug]/unauthorized`. Platform pages (e.g. platform/plans) redirect non–platform-admin to dashboard.
- **Error pages:** 403-style → `src/app/[orgSlug]/unauthorized/page.tsx`; 404 → `src/app/not-found.tsx`.
- **Data:** All list/detail fetches use TanStack Query (`useQuery`/`useMutation`) via `lib/api/client.ts`; no direct fetch in views.
