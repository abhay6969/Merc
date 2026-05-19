# Clerk Billing (Pro plan)

Merc gates **GitHub import** and **GitHub export** behind the **Pro** plan.

## Dashboard setup

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → **Billing** → enable billing.
2. Create plans:
   - **Free** (default)
   - **Pro** with plan key/slug: `pro`
3. Connect Stripe (production) or use the Clerk development gateway (local dev).

## Code checks

API routes use:

```typescript
const { has } = await auth();
const isPro = has({ plan: "pro" });
```

Non-Pro users receive `403` with `{ error: "Pro plan required", code: "PRO_PLAN_REQUIRED" }`.

## Headers

Billing UI (Clerk profile / Stripe) works with **COEP: credentialless** in `next.config.ts`. Do not switch to `require-corp` without testing Clerk embeds.
