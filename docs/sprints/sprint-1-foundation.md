# Sprint 1: UI Foundation & Core Views

**Sprint**: 1
**Dates**: March 7–14, 2026
**Goal**: Scaffold the Next.js project, integrate auth, build plan catalog and tenant subscription dashboard
**MVP Deadline**: March 17, 2026

**Progress (March 6, 2026):** Full Next.js 16 app scaffold complete. SSO/PKCE, [orgSlug] routes, dashboard, plans (comparison matrix), usage, billing, settings, platform admin (plans CRUD, all subscriptions table). devops-k8s values.yaml created for subscription-ui (subscriptions.codevertexitsolutions.com). **Remaining:** Wire to pricingapi; deploy.

---

## Context

The `subscriptions-ui` repo is scaffolded with a full Next.js app. The subscriptions-api is already deployed at `pricingapi.codevertexitsolutions.com` with working endpoints for plans, subscriptions, features, and products. Remaining work: API data integration and production deploy.

---

## Deliverables

### P0 — Must Ship

#### 1. Project Scaffolding
- [ ] `npx create-next-app@latest` with App Router, TypeScript, Tailwind, ESLint
- [ ] Install: `shadcn/ui`, `@tanstack/react-query`, `lucide-react`
- [ ] Configure `tailwind.config.ts` with BengoBox design tokens (colors, fonts)
- [ ] Set up `lib/api/client.ts` — typed fetch wrapper with Bearer token injection
- [ ] Set up `lib/api/subscriptions.ts`, `lib/api/plans.ts`, `lib/api/products.ts`
- [ ] Set up `.env.local` with API URLs
- [ ] Dockerfile + CI/CD pipeline (GitHub Actions → ArgoCD)

#### 2. Auth Integration
- [ ] Install `shared-auth-client` JS SDK (or create thin wrapper)
- [ ] Auth provider in `app/layout.tsx` — handle login redirect, token storage
- [ ] Auth middleware for route protection (redirect unauthenticated users)
- [ ] Extract `tenant_id`, `roles` from JWT claims
- [ ] Platform admin role detection for conditional sidebar items

#### 3. Subscription Dashboard (`/subscriptions`)
- [ ] Fetch `GET /tenants/{tenant_id}/subscription` via TanStack Query
- [ ] Display: plan name, status badge, trial countdown, billing period
- [ ] Feature list (checkmarks for enabled features)
- [ ] Usage meters (orders, riders, admins vs limits) — progress bars with color coding
- [ ] Active products list with count
- [ ] "Upgrade" CTA button linking to plan catalog
- [ ] Handle 404 (no subscription) — show "Get Started" prompt

#### 4. Plan Catalog (`/subscriptions/plans`)
- [ ] Fetch `GET /plans` via RSC (server component)
- [ ] Plan comparison matrix — 3 columns (Starter, Growth, Professional)
- [ ] Monthly/Annual toggle with savings display
- [ ] Feature comparison rows with check/cross icons
- [ ] Limits comparison (admins, riders, orders, outlets)
- [ ] Pricing display in KES
- [ ] Current plan highlight (pulled from subscription query)
- [ ] "Upgrade" / "Downgrade" / "Current Plan" button per column

#### 5. Plan Change Flow (`/subscriptions/upgrade`)
- [ ] Plan selector (only show plans different from current)
- [ ] Before/after comparison (features gained, features lost, price delta)
- [ ] Confirmation dialog with plan change summary
- [ ] Call `PUT /tenants/{tenant_id}/subscription/plan`
- [ ] Success toast → redirect to dashboard
- [ ] Error handling (show API error message)

### P1 — Should Ship

#### 6. Product Subscriptions (`/subscriptions/products`)
- [ ] Fetch `GET /tenants/{tenant_id}/products`
- [ ] Product cards: name, description, category badge, status toggle
- [ ] Activate/deactivate product via API calls
- [ ] Show product dependencies (e.g., logistics requires ordering)

#### 7. Layout & Navigation
- [ ] Sidebar navigation: Dashboard, Plans, Products, Usage
- [ ] Admin sidebar section (conditional on `platform_admin` role): Subscriptions, Plans, Bundles, Overrides
- [ ] Header: tenant name, user avatar, plan badge
- [ ] Mobile-responsive: collapsible sidebar, bottom nav on mobile

#### 8. Platform Admin — Subscription List (`/admin/subscriptions`)
- [ ] Fetch all tenant subscriptions (requires admin endpoint — blocked by API sprint 3)
- [ ] Data table: tenant name, plan, status, period end, bundle
- [ ] Search, filter by status/plan, sort by period end
- [ ] Row click → tenant detail page

### P2 — Nice to Have

#### 9. Usage Dashboard (`/subscriptions/usage`)
- [ ] Visual meters for each metric type
- [ ] Period selector
- [ ] Overage indicators

#### 10. Loading & Error States
- [ ] Skeleton loaders for all data-fetching pages
- [ ] Error boundaries with retry buttons
- [ ] Empty states with helpful prompts

---

## Definition of Done

- [ ] Project runs locally with `pnpm dev`
- [ ] Auth flow works: login → redirect → JWT extraction → protected routes
- [ ] Dashboard shows live data from `pricingapi.codevertexitsolutions.com` for `urban-loft` tenant
- [ ] Plan catalog displays all 3 tiers with accurate pricing and features
- [ ] Plan change flow works end-to-end (select → confirm → API call → success)
- [ ] Responsive: works on desktop (1024px+) and mobile (375px+)
- [ ] TypeScript strict mode, no lint errors
- [ ] Deployed to staging via CI/CD

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth SDK not ready for JS | High | Build thin fetch-based wrapper; JWKS validation server-side |
| API admin endpoints not ready | Medium | Stub admin pages; show read-only data from existing endpoints |
| Design system not finalized | Low | Use shadcn/ui defaults; iterate on colors/fonts later |

---

## Dependencies

- `subscriptions-api` deployed and accessible (done)
- `shared-auth-client` JS SDK (or equivalent token management)
- Design tokens from BengoBox design system
- Domain `subscriptions.codevertexitsolutions.com` provisioned
