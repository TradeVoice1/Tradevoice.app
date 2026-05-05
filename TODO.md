# Tradevoice — deferred work

Things that have been explicitly punted to a later session, with enough context
to pick up cold. Update this as we go.

---

## 1. Card-on-file at signup (Stripe SetupIntent) — 🔴 HIGH PRIORITY

**Why deferred:** Needs Stripe platform account, serverless endpoints, env vars,
and ToS revisions — too much new infrastructure to mix into a UX session.

**Goal:** Trial requires a card up front. When the 28-day trial ends, Stripe
auto-charges the card on file. User must agree in ToS.

**What to build:**

1. **Stripe account setup** (no code)
   - Confirm platform account at https://dashboard.stripe.com is live.
   - Grab keys:
     - `pk_test_51TIFb3H...` (publishable, goes in front-end)
     - `sk_test_51TIFb3H...` (secret, goes in Vercel env vars only)

2. **Vercel env vars**
   - `STRIPE_SECRET_KEY` (server)
   - `VITE_STRIPE_PUBLISHABLE_KEY` (client)
   - `STRIPE_WEBHOOK_SECRET` (for webhook signing)

3. **Serverless endpoints** (`api/` folder, Vercel functions)
   - `POST /api/stripe/setup-intent` — creates a customer + SetupIntent for the
     signed-in user, returns `client_secret`.
   - `POST /api/stripe/webhook` — verifies signature, listens for
     `customer.subscription.created`, `invoice.payment_succeeded`,
     `invoice.payment_failed`, `customer.subscription.deleted`.

4. **Front-end signup flow change**
   - Add a 4th step to `SignupScreen` after Plan: "Payment Method".
   - Mount Stripe `<CardElement>` (or PaymentElement) using
     `@stripe/react-stripe-js`.
   - On submit: confirm SetupIntent client-side → store `stripe_customer_id`
     + `stripe_payment_method_id` on the user's `profiles` row.
   - Block `onComplete` until card is saved (or until the user explicitly
     opts out, if we want a "trial without card" path).

5. **Schema additions** (migration `0003_stripe.sql`)
   ```sql
   alter table public.profiles
     add column if not exists stripe_customer_id text,
     add column if not exists stripe_payment_method_id text,
     add column if not exists stripe_subscription_id text,
     add column if not exists trial_ends_at timestamptz default (now() + interval '28 days'),
     add column if not exists subscription_status text default 'trialing';
   ```

6. **Trial-end charge**
   - Best path: create a Stripe Subscription with `trial_period_days = 28` at
     signup. Stripe handles the auto-charge. We just listen to webhooks for
     status changes.
   - Update `subscription_status` on `customer.subscription.updated`.
   - Show "Trial ended" / "Past due" / "Cancelled" in the top-bar pill based
     on the column instead of the hand-computed date.

7. **Terms of Service revision**
   - Add explicit auto-renew + auto-charge clause.
   - Surface it on the signup checkbox copy: "I agree to the ToS, Privacy
     Policy, and to be charged $X/mo after the 28-day trial unless I cancel."
   - File at `src/LegalScreens.jsx` — `TermsScreen` component.

**Estimated effort:** 4–6 hours.

---

## 2. Logo upload → Supabase Storage — 🟡 MEDIUM

Currently `logo` lives in front-end state only and disappears on refresh.
The DB column `profiles.logo_url` already exists; we just need somewhere to
put the file.

- Create a public Storage bucket `company-logos` in Supabase.
- Add `uploadLogo(file)` helper in `src/data/storage.js`.
- Wire it up in `ProfileModal` → on file pick, upload, get URL, save to
  `profiles.logo_url` via `upsertProfile`.

**Estimated effort:** 30 min.

---

## 3. Code-split the bundle — 🟡 MEDIUM

Bundle is ~840 KB minified, 295 KB gzipped. Vite warns. Worth doing before
launch.

- Convert imports of `ScheduleScreen`, `MarketingScreen`, `LegalScreens`,
  `ForgotPasswordScreen`, `Onboarding`, `InvoicePaymentPage`, `Estimator` to
  `React.lazy(() => import(...))`.
- Wrap `<content />` in `<Suspense fallback={...}>` in the main router.

**Estimated effort:** 30 min.

---

## 4. Re-enable React StrictMode for final QA — 🟢 LOW

We disabled it in `src/main.jsx` because it was orphaning the gotrue lock and
making sign-in hang. Before launch, turn it back on and confirm sign-in still
works (the `getProfile` simplification + 5-second safety timeout I added
should cover us, but worth a real verification).

---

## 5. Items from the 59-item roadmap still pending

From the original feature list in our planning conversation:

- **#1 OnboardingScreen wiring** — duplicates the existing in-app Onboarding;
  decide which to keep.
- **#23–27 Stripe payments on invoices** — the contractor accepts client
  payments via Stripe Connect with a 1% platform fee. Different from #1
  above (that's about charging the contractor for their subscription).
- **#28–33 AI suite** — TaxJar tax lookup, Claude line-item suggestions,
  receipt scanning (Vision/Textract). Each is its own integration session.
- **#36–38 Marketing automations** — review requests, email campaigns,
  follow-ups. UI is built; needs SendGrid/Resend wiring.
- **#42 Client appointment notifications** — SMS via Twilio.
- **#48 Governing law: Alabama** — confirm in ToS once filed.
- **#49–54 Business setup** (LLC, EIN, Mercury, Google Workspace) — non-code,
  on you.
- **#55–59 Marketing-site updates** — `tradevoice-website.html` revisions.

---

## 6. Pre-existing lint warnings

`eslint src/App.jsx` reports ~50 errors that pre-date our session, all of the
form "components defined inside render" (`TH`, `SortArrow`, `SectionLabel`,
etc. inside `InvoiceHub`, `Settings`, etc.). Functionally fine; cosmetic
cleanup. ~1 hour.
