# Subscriptions UI E2E Tests

Playwright E2E tests for subscriptions-ui. Run against production base URL by default.

## Prerequisites

```bash
pnpm install
npx playwright install
```

## Run

```bash
pnpm test:e2e
```

Local runs open the browser (headed). Set `CI=true` for headless. Env vars:

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Subscriptions UI origin | `https://pricing.codevertexitsolutions.com` |
| `E2E_LOGIN_EMAIL` | SSO login email | `demo@bengobox.dev` |
| `E2E_LOGIN_PASSWORD` | SSO login password | (set in env) |

Artifacts: `playwright-report/`, `test-results/` (gitignored).
