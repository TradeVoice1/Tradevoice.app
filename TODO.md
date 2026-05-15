# Tradevoice — deferred work

Things that have been explicitly punted to a later session, with enough context
to pick up cold. Update this as we go.

---

## 🚨 Vercel Pro upgrade (deferred 2026-05-14)

The Rate Library push (commit `cfaa3c7`) hit Vercel Hobby's **12 serverless
function limit per deployment** — adding `api/library/parse-rate-table.js`
pushed us to 13 and the deploy ERRORed at upload (build itself was clean).
Worked around tonight by consolidating `send-review-request.js` +
`send-campaign.js` into a single `api/marketing/send.js` with a `type`
discriminator — back to 12 functions.

**Why upgrade ($20/mo per seat):**
- Removes the function cap entirely
- Unlocks **Vercel Cron** — required for two pending features:
  - Recurring jobs auto-generation (plans → jobs when `nextDueAt` arrives)
  - Marketing automations Phase 2 (trigger-based: "invoice paid → 2d → review request")
- Longer function timeouts (300s vs 60s) — useful if Claude PDF parsing ever
  needs more than 10s on a big rate sheet
- Better build performance + more concurrent function executions
- Pays for itself the first time we ship a cron-backed feature

**When to do it:** before either of the cron-dependent features above. After
the LLC is filed + business bank account is set up, billing under the LLC.

**After upgrade:** can optionally re-split `api/marketing/send.js` back into
two files if we want cleaner separation — but the consolidated version works
fine indefinitely, so this is purely aesthetic.

---

## ✅ Recently shipped (overnight session 2026-05-08)

**Trade catalog expanded from 5 → 56 trades.**

- Refactored `TRADE_CONFIG` into `src/data/trades/` — one file per trade
- Built out 51 new trades across Construction (38) + Service (18)
- Each trade documents its industry-standard reference (NEC, ASHRAE, ASPE,
  NRCA, IICRC, etc.) and ships with a curated material/equipment library
  (12-16 items typical, prices BLANK so contractor fills in their own)
- Default labor rates from BLS occupational wage data
- Distinct color + gradient stripe per trade so the document accent reads
  the same way across the app
- SignupScreen trade picker rebuilt: category tabs (Construction / Service /
  Multi-Trade), search box, scrollable chip grid, selected-count summary
- Marketing site updated with the full trade list + comparison-table row
  bumped to "56+ trades"

**Open follow-ups:**
- Per-trade scope-of-work template language could be tightened with full
  example specs per trade (currently each trade has a starter placeholder)
- Pricing tier strategy decision pending: at 56 trades, "All Trades" $149
  may be undersold. See chat — three pricing options proposed: bump All
  Trades to $199-249, add 4th tier (Construction vs Service split), or
  switch to per-user like Jobber. No code change yet — user to decide.
- AI material price lookup (the Lowe's/Home Depot search idea) was
  explicitly deferred to focus on the trade catalog first.

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

## 2. Logo upload → Supabase Storage — ✅ DONE

Shipped (likely overlapping with the trade-catalog session). Implementation:

- Migration `0004_logo_storage.sql` creates public bucket `company-logos`
  with RLS keyed to `<userId>/...` paths
- `src/data/storage.js` exports `uploadLogo` + `deleteLogo`
- `App.jsx` ProfileModal wires the file input through `handleFile` + replaces
  old logo URLs cleanly on each upload

---

## 3. Code-split the bundle — ✅ MOSTLY DONE (2026-05-12)

Round 1 already split out `ScheduleScreen`, `JobsScreen`, `PlansScreen`,
`MarketingScreen`, `LegalScreens`, `ForgotPasswordScreen`, `InvoicePaymentPage`,
`QuoteCustomerPage` — all `React.lazy()` in `App.jsx:4-13`.

Round 2 (2026-05-12 session):
- `vite.config.js` now splits trades data + Stripe + Supabase SDKs into their
  own chunks via `rollupOptions.output.manualChunks`
- `BillingPaymentModal` made lazy (only loads when user opens "Update Card")
- Main bundle: 736 KB → 635 KB (271 KB → 246 KB gzipped)
- `chunkSizeWarningLimit` bumped to 800 so the informational warning is silenced

Remaining bundle is dominated by `App.jsx` itself (monolithic file with
Dashboard, InvoiceHub, InvoiceEditor, InvoiceDocument, Quotes, Clients,
Settings all inline). Further wins require extracting those components to
their own files — a multi-hour refactor, not a quick win.

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
- **#36–38 Marketing automations** — Phase 1 SHIPPED 2026-05-12:
  - Resend integration (`api/_lib/email.js`, `api/marketing/send-*.js`)
  - Migration 0019: `marketing_sends`, `marketing_campaigns`,
    `clients.reviewed_at` + `clients.review_requested_at`
  - MarketingScreen wired to real data — review-request modal, campaign
    modal, real activity feed, real stats. Replaced the mockup entirely.
  - Phase 2 (still pending): trigger-based automations (need Vercel Cron
    to fire "invoice paid → wait 2 days → send review request"). The
    Automations tab shows a "Coming soon" banner today.
  - Manual setup the user still has to do: verify `thetradevoice.com` in
    Resend dashboard + add DKIM/SPF DNS records on GoDaddy + set
    `RESEND_API_KEY` env var in Vercel.
- **#42 Client appointment notifications** — SMS via Twilio.
- **#48 Governing law: Alabama** — confirm in ToS once filed.
- **#49–54 Business setup** (LLC, EIN, Mercury, Google Workspace) — non-code,
  on you.
- **#55–59 Marketing-site updates** — `tradevoice-website.html` revisions.

---

## 5b. Scheduling roadmap (post-launch)

Brainstormed in chat — all feasible on the current stack. Grouped by effort.

### Tier 1 — Quick wins — ✅ ALL SHIPPED

Audited 2026-05-12 and discovered every Tier 1 item was already implemented
in earlier sessions. Pointers if anything regresses:

- **Last-tech memory** — `lastJobForClient` in `ScheduleScreen.jsx`
  (AddJobModal, ~line 679). Auto-assigns the tech who last serviced the
  client; surfaces a "Last serviced by X on Y — auto-assigned" hint.
- **Default duration by job type** — `avgDurationForTitle` in same modal
  (~line 687). Averages similar titles, rounds to nearest 0.5 hr, pre-fills.
- **Job → Invoice in one click** — `handleJobToInvoice` in `App.jsx`
  (~line 7564). UI surface is the "Create Invoice" button in
  `JobDetailModal` (gated on `status === 'completed' && !invoiceId`).
  Pre-fills client, trade, default labor row from `TRADE_CONFIG`, carries
  tech name into the activity log.
- **Tech filter on calendar** — `filterTech` state in `ScheduleScreen`
  (~line 1103); UI buttons render the full team list, filtering all three
  views (Month/Week/Day).
- **Status colour-coding finished** — Overdue gets light-red wash + red
  left bar; in-progress gets light-amber wash + amber left bar;
  completed fades to 60% opacity; cancelled fades to 35%. Consistent
  across Month/Week/Day. (In-progress amber added 2026-05-12 — was the
  only piece of the Tier 1 batch still missing.)

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
