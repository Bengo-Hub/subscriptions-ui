# Subscriptions UI

BengoBox subscriptions management UI. Plans, usage, billing, platform admin.

## Dev

```bash
pnpm install
pnpm dev
```

## Deploy

Deployed at `https://subscriptions.codevertexitsolutions.com`. CI on push to `main`. Image: `subscription-ui` (devops naming).

## Push from this folder (own repo)

```bash
# From: subscriptions-service/subscriptions-ui
git remote add origin https://github.com/YOUR_ORG/subscriptions-ui.git
git branch -M main
git push -u origin main
```
