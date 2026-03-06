# Subscription UI — UX/UI Specification

## Design Principles

1. **Clarity over density** — Subscription status must be instantly understood
2. **Action-oriented** — Every page has a clear primary action
3. **Confidence in changes** — Plan changes show before/after comparison with confirmation
4. **Urgency cues** — Trial expiry, usage limits, and expired status use progressive visual urgency

---

## Tenant Admin Views

### Subscription Dashboard (`/subscriptions`)

The home page for tenant admins. Shows everything about their current subscription at a glance.

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Current Plan: Growth (Standard)    [Upgrade] │
│ Status: ● TRIAL (8 days remaining)           │
│ Period: Mar 6 – Mar 20, 2026                 │
├─────────────────────────────────────────────┤
│ Features (12 enabled)                        │
│ ✓ Customer Portal    ✓ Rider App             │
│ ✓ Loyalty Program    ✓ Multi-Outlet          │
│ ✓ Advanced Analytics ✓ Promo Codes           │
│ ...                                          │
├─────────────────────────────────────────────┤
│ Usage This Period                            │
│ Orders:  142 / 1,000/day    ████░░░░ 14%    │
│ Riders:  3 / 15             ██░░░░░░ 20%    │
│ Admins:  2 / 3              █████░░░ 67%    │
├─────────────────────────────────────────────┤
│ Active Products (4)           [Manage →]     │
│ Ordering · Logistics · Treasury · Storefront │
└─────────────────────────────────────────────┘
```

**Status Badge Colors**:
| Status | Color | Label |
|--------|-------|-------|
| TRIAL | Yellow/Amber | `Trial (N days left)` |
| ACTIVE | Green | `Active` |
| SUSPENDED | Orange | `Suspended — Payment required` |
| EXPIRED | Red | `Expired` |
| CANCELLED | Gray | `Cancelled` |

**Trial Countdown Urgency**:
- 7+ days: Calm amber badge
- 3-6 days: Prominent amber with pulse
- 1-2 days: Red with urgent message
- 0 days: Red banner "Trial expires today"

### Plan Catalog (`/subscriptions/plans`)

Side-by-side plan comparison matrix.

**Layout**:
```
┌──────────────┬──────────────┬──────────────┐
│   Starter    │    Growth    │ Professional │
│   KES 2,500  │  KES 6,000  │ KES 12,500   │
│   /month     │   /month    │   /month     │
├──────────────┼──────────────┼──────────────┤
│ 2 Admins     │ 3 Admins    │ Unlimited    │
│ 5 Riders     │ 15 Riders   │ 30 Riders    │
│ 300 Orders   │ 1K Orders   │ 2.5K Orders  │
│ 1 Outlet     │ 3 Outlets   │ Unlimited    │
├──────────────┼──────────────┼──────────────┤
│ ✓ Ordering   │ ✓ Ordering  │ ✓ Ordering   │
│ ✓ Rider App  │ ✓ Rider App │ ✓ Rider App  │
│ ✗ Loyalty    │ ✓ Loyalty   │ ✓ Loyalty    │
│ ✗ Multi-Out  │ ✓ Multi-Out │ ✓ Multi-Out  │
│ ✗ POS        │ ✗ POS       │ ✓ POS        │
│ ✗ Webhooks   │ ✗ Webhooks  │ ✓ Webhooks   │
├──────────────┼──────────────┼──────────────┤
│ Current Plan │ [Upgrade]   │ [Upgrade]    │
└──────────────┴──────────────┴──────────────┘
Toggle: [Monthly] / [Annual — Save ~8%]
```

Current plan column is highlighted with a distinct border. Upgrade buttons are primary CTA. "Current Plan" label replaces button on active plan.

### Plan Change Flow (`/subscriptions/upgrade`)

Step-by-step flow with before/after comparison:

1. **Select Plan** — Card selection (only shows eligible plans)
2. **Review Changes** — Side-by-side: current plan vs new plan, features gained/lost, price difference
3. **Confirm** — Summary with "Change Plan" CTA

On confirmation, show success toast and redirect to dashboard with updated state.

### Product Subscriptions (`/subscriptions/products`)

Grid of product cards showing status (active/inactive) with activate/deactivate toggles.

### Usage Dashboard (`/subscriptions/usage`)

Visual meters for each tracked metric:
- Progress bars: green (0-70%), yellow (70-90%), red (90-100%+)
- Overage indicator when limit exceeded
- Period selector (current period default)

---

## Platform Admin Views

### All Subscriptions (`/admin/subscriptions`)

Data table with columns: Tenant Name, Plan, Status, Period End, Bundle, Actions.

**Features**:
- Search by tenant name/ID
- Filter by status (TRIAL, ACTIVE, SUSPENDED, EXPIRED, CANCELLED)
- Filter by plan
- Sort by period end (to see expiring soon)
- Row click → tenant detail

### Tenant Subscription Detail (`/admin/subscriptions/[id]`)

Full view of a tenant's subscription with admin actions:
- Change plan (immediate)
- Override features (enable/disable specific features)
- Extend trial
- Cancel/suspend
- View subscription history timeline

### Plan Management (`/admin/plans`)

CRUD table for subscription plans:
- Create new plan (name, code, pricing, tier limits, features)
- Edit existing plan
- Activate/deactivate plan
- View feature matrix

### Feature Overrides (`/admin/overrides`)

Table of active manual overrides:
- Tenant, feature, override type (ENABLE/DISABLE), reason, effective dates
- Create new override
- Remove override

---

## Component Specifications

### Plan Card
- Plan name + tier badge
- Monthly price (prominent)
- Annual price (smaller, with savings %)
- Top 5 features as bullet list
- Limits summary (admins, riders, orders)
- CTA button (contextual: "Get Started" / "Upgrade" / "Current Plan")

### Usage Meter
- Label: metric name
- Current value / limit
- Progress bar with color coding
- Overage indicator (if applicable)

### Status Badge
- Pill-shaped badge with icon + label
- Color-coded per status table above
- Optional tooltip with detail (e.g., trial end date)

### Subscription History Timeline
- Vertical timeline of lifecycle events
- Event type icon + description + timestamp
- Actor (user/system/admin) badge

---

## Responsive Behavior

- **Desktop (1024px+)**: Full layout with sidebar navigation
- **Tablet (768-1023px)**: Collapsible sidebar, stacked plan cards
- **Mobile (< 768px)**: Bottom navigation, single-column plan cards, accordion feature lists
