# Plan links from other apps (Nov 2026)

**Status:** Done

## Delivered
- [x] `/plans?service=` accepts a subscriptions-api service tag as well as a plan-code prefix. The
  tag resolves through the plans that carry it, so `pos` opens PowerSuite, `hospital` opens
  Codevertex Afya and `isp_billing` opens ISP Billing. Before this, auth-ui's billing links and
  pricing page passed tags that matched no tab and landed on the first product.
- [x] `/plans?plan=<CODE>` with no service opens that plan's product, and a one-time plan code
  opens on the "One-time licence" view with the plan marked as the selection.

## Linked from
- accounts.codevertexafrica.com/pricing: "Compare every feature and limit" and every buy button
  (`/subscribe?plan=<CODE>`). See auth-ui `docs/sprints/sprint-7-public-pricing.md`.
- auth-ui dashboard billing tab and plan cards.

## Open items
- `/plans` and the feature catalog need a session, so a signed-out visitor comparing plans from
  the public pricing page is asked to sign in first.
- Plan codes are case sensitive in `GET /api/v1/plans/code/{code}`. Every caller must pass the
  code exactly as stored.
