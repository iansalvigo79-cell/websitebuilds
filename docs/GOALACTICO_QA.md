# Goalactico – Testing & QA Checklist

Use this checklist to verify core flows before release.

## 1. Prediction submission and locking

- [ ] **Sign in** → open Predictions page, select a match day with future kickoff.
- [ ] Enter **Full-Time Goals** (e.g. 55), click **Update Prediction** → success toast and value persists after refresh.
- [ ] For a match day whose **first match has already kicked off**, the FT Goals input and **Update Prediction** button are disabled; button shows “Predictions locked”.
- [ ] Call `POST /api/predictions/update` with a locked match day and valid JWT → response **400** “Predictions are locked”.

## 2. Points calculation

- [ ] In **Admin → Scores**, set **Actual total goals** for a match day (or use **From games** if game scores are set). Click **Save**.
- [ ] Click **Calculate points for all match days** → success toast with counts.
- [ ] On **Leaderboard**, confirm users who predicted that match day have updated total points (exact = 10, ±1 = 7, ±2 = 4, ±3 = 2, else 0).

## 3. Leaderboard

- [ ] **Leaderboard** page loads; toggle **Seasonal / Weekly / Monthly** and confirm rankings and totals update.
- [ ] After running points calculation, leaderboard reflects new points without needing a full page reload (or after refresh).

## 4. Stripe payment flows

- [ ] **Paywall**: signed-in user clicks **Subscribe Now** → redirects to Stripe Checkout (if `STRIPE_PRICE_ID` and `STRIPE_SECRET_KEY` are set).
- [ ] After successful payment, redirect to dashboard; **profiles.subscription_status** = `active`, **stripe_customer_id** and **stripe_subscription_id** set.
- [ ] **Webhook**: send a test `checkout.session.completed` or `customer.subscription.updated` from Stripe Dashboard to `POST /api/stripe/webhook`; profile updates in Supabase.
- [ ] Cancellation: `customer.subscription.deleted` (or status not `active`) → profile reverts to free tier (`subscription_status` = `cancelled` or inactive).

## 5. Free vs paid access

- [ ] **Free user**: Predictions page shows “Free plan: Full-Time Goals only”; only FT Goals is editable; premium cards show “Premium”.
- [ ] **Paid user** (or test subscription): same page without free-plan warning; premium cards still show “Premium” until HT/FT corners are implemented in DB.
- [ ] **useRequirePaid** on paid-only routes redirects unauthenticated users to sign-in and non-paid users to `/paywall`.

## 6. Auth

- [ ] **Sign up** with email/password, display name, team → profile created with `subscription_status: 'inactive'`.
- [ ] **Sign in** → redirect to dashboard.
- [ ] **Forgot password** → email link → **Reset password** → can sign in with new password.
- [ ] **Logout** → session cleared, redirect to home.

## 7. Admin

- [ ] **Admin** page requires sign-in; **Seasons** tab: create season (name, start/end date).
- [ ] **Scores** tab: list of match days, set actual total goals (manual or “From games”), Save; then **Calculate points**.
- [ ] (Optional) **Match Days** / **Games** tabs: add match days and games as per your schema.

## Prize winners table (optional)

**Prize competitions:** Run the migration in `supabase/migrations/20250224000000_create_prizes.sql` in the Supabase SQL Editor to create the `prizes` table. Admin → Prizes tab then lets you suggest the top-ranked user for a period, create a prize with description, and mark as awarded when sent. Users who have won a prize see a dashboard banner: "You won a prize! Check your email."

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (for live Stripe)
- `ADMIN_SECRET` (optional, for `POST /api/admin/calculate-points` with header `x-admin-secret`)
- `NEXT_PUBLIC_APP_URL` (optional, for Stripe success/cancel redirect URLs)
