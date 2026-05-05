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

## 5b. Scheduling roadmap (post-launch)

Brainstormed in chat — all feasible on the current stack. Grouped by effort.

### Tier 1 — Quick wins (~1-2 hrs each)

- **Last-tech memory.** When picking a client in Add Job modal, show "Carlos last
  serviced this client on Mar 12" and pre-select that tech.
- **Default duration by job type.** Average past durations for similar titles
  and prefill the duration field.
- **Job → Invoice in one click.** "Mark job completed" auto-creates a draft
  invoice with the client + line items prefilled (mirrors Quote → Invoice).
- **Tech filter on calendar.** "Only show Carlos's jobs" toggle.
- **Status colour-coding finished.** Overdue jobs in red, in-progress in amber,
  completed faded out.

### Tier 2 — Medium (~3-5 hrs each)

- **Recurring jobs / maintenance plans.** New `plans` table. Plan auto-creates
  jobs on schedule (annual HVAC tune-up, quarterly fire-system inspection). 🔁
  icon on calendar entries. Last-serviced + next-due tracking.
- **Maintenance-due dashboard widget.** "3 clients due for service this week" —
  click to bulk-create the jobs.
- **Tech time-off / availability.** Block out a tech for vacation/sick. Calendar
  greys them out; Add Job hides them for those days.
- **Drag-and-drop reschedule.** Drag a job between days / techs in week view.
- **Skill-based tech filtering.** Driven by existing `team_members.trades` —
  HVAC techs only see HVAC jobs by default.
- **Job photos.** Tech attaches before/after photos via Supabase Storage.
  Photos appear on the resulting invoice.

### Tier 3 — Bigger features (full session each + third-party costs)

- **Subscription billing for maintenance plans.** Stripe recurring charges.
  $X/mo or $Y/yr covers N visits per year. Requires Stripe Connect (#1 above)
  to be live first.
- **Route optimization.** Sort a tech's daily jobs by drive time. Needs
  Google Maps Directions API or Mapbox (~$0.005 per route after free tier).
- **Client portal.** Customers log in to see upcoming maintenance, past
  invoices, request service. New "client" role on `profiles` + a separate
  client-facing route. ~6-8 hrs.
- **SMS / email job reminders.** Twilio (~$0.0075/text) or SendGrid for email.
  "Tech is on the way 30 min" texts; 24-hour reminders.
- **GPS check-in at job site.** Tech taps "I'm here" → records location +
  timestamp. Acts as proof of service. Originally punted in the roadmap doc;
  worth re-evaluating once everything else is shipped.

---

## 6. Pre-existing lint warnings

`eslint src/App.jsx` reports ~50 errors that pre-date our session, all of the
form "components defined inside render" (`TH`, `SortArrow`, `SectionLabel`,
etc. inside `InvoiceHub`, `Settings`, etc.). Functionally fine; cosmetic
cleanup. ~1 hour.
