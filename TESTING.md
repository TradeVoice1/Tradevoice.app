# Tradevoice — Pre-Launch Testing Day

One focused day where we click through every flow that real contractors
will hit, in production with live integrations. Goal is to surface any
broken paths before we start inviting beta users off the allowlist.

**How to use this doc:** Run top-to-bottom in one sitting (~3-4 hrs). Check
boxes as you go. When something fails, write the symptom directly under
that line — don't fix it mid-test, just log it and keep moving. Pick a
recovery day later for the bug-fix pass.

Open the app at `https://app.thetradevoice.com` in an **incognito Edge
window** so there's no cached session interfering. Have Stripe Dashboard
(live mode!) and Supabase SQL editor open in two other tabs for the
verification checks.

---

## Pre-flight (do these once at the start)

- [ ] Vercel: latest production deploy is `READY` (no orange "Building" dot)
- [ ] Supabase: latest migration applied (check `supabase/migrations/` highest number lines up with what's in the DB — `select max(version) from supabase_migrations.schema_migrations`)
- [ ] Stripe: confirm you're in **Live mode** (top-right toggle, no "TEST" orange banner)
- [ ] Resend: API key matches what's in Vercel env (`RESEND_API_KEY` should start with `re_`)
- [ ] Allowlist: `VITE_EARLY_ACCESS_EMAILS` env var includes the test email you'll use today
- [ ] Pick one test email + one test client email (real inboxes you control)
- [ ] Have a real US business card or use Stripe live-mode test card `4242 4242 4242 4242` (it works in live too)

---

## Part 1 — Stripe live-mode smoke test 🚨

**Status:** ⏳ Blocker. We left this pending after live activation — never
ran an end-to-end signup against live Stripe. This is the most critical
test of the day because if anything in the Stripe pipeline is broken,
everything downstream that touches billing (tech seats, service
contracts, invoice payments) breaks too.

### 1a. Owner signup → trial start
- [ ] Open incognito Edge → `app.thetradevoice.com` → Sign Up
- [ ] Complete all 4 steps (use Solo Monthly $49.99 — cheapest if you decide to keep it)
- [ ] Card: `4242 4242 4242 4242` · any future expiry · any CVC · any ZIP
- [ ] Click **Start 28-Day Trial**
- [ ] **Expected:** lands on Dashboard, no errors, trial countdown shows ~28 days

### 1b. Verify Stripe Dashboard
- [ ] Stripe → Customers → find new customer by email
  - [ ] Has `tradevoice_user_id` in metadata
  - [ ] Default payment method attached
- [ ] Stripe → Subscriptions → find new subscription
  - [ ] Status: `trialing`
  - [ ] Price: matches Solo monthly Price ID
  - [ ] Trial end: ~28 days from today
- [ ] Stripe → Workbench → Events
  - [ ] `customer.subscription.created` event present
  - [ ] Webhook delivery: green checkmark (2xx response)
  - [ ] If red: click the event, copy the failure reason

### 1c. Verify Supabase profile row
- [ ] Supabase SQL: `select id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at from profiles where email = '<test email>';`
- [ ] All five Stripe-related columns are populated (not null)
- [ ] `subscription_status = 'trialing'`

### 1d. Stripe Connect onboarding (payment collection)
- [ ] Settings → Payments → Connect Stripe
- [ ] Complete the Stripe Connect Standard onboarding flow
- [ ] After return, `profiles.stripe_account_id` is set, `stripe_account_charges_enabled` flips to `true` (may take 1-2 min after webhook fires)

### 1e. Tech seat add-on
- [ ] Settings → Team → Buy a Tech Seat
- [ ] Create a test tech: `Tech Test` / `tech-test@yourdomain.com`
- [ ] Verify Stripe subscription now has a second line item: `STRIPE_PRICE_TECH_SEAT` × 1
- [ ] Delete that team_member
- [ ] Verify Stripe subscription line item drops back to base plan only
- [ ] Proration credits/charges appear correctly in upcoming invoice

---

## Part 2 — Core daily flows

### 2a. Clients
- [ ] Create a new client (real info — use yourself as a test client)
- [ ] Edit the client — all fields save
- [ ] Delete a different test client — confirms removed

### 2b. Quotes
- [ ] Quote Builder → new quote → add labor + materials + equipment
- [ ] Save as draft
- [ ] Send to client (real email) → verify email arrives, customer portal link works
- [ ] Customer view → accept → status flips to "Accepted" in app

### 2c. Invoices
- [ ] Convert that accepted quote → invoice
- [ ] All commercial fields render (PO#, work order, job site, requested by, approved by, salesperson, permit, COI, late fee, customer e-sig)
- [ ] Send invoice → real email arrives with payment link
- [ ] Customer portal → "Pay now" → use `4242` card → payment succeeds
- [ ] Invoice flips to **Paid** in app
- [ ] `payments` row inserted in Supabase
- [ ] Stripe Dashboard → Payment Intents shows the charge with the 1% platform fee + 3.9%+$0.30 Stripe fee
- [ ] Funds routed to your connected Stripe account (not Tradevoice's platform balance)

### 2d. Jobs + Schedule
- [ ] Convert invoice → job (or create one fresh)
- [ ] Drag a job on the Schedule screen — date/time saves
- [ ] Mark job in-progress — amber styling shows
- [ ] Mark job complete — status flips

### 2e. Plans (service contracts)
- [ ] Plans screen → create a new maintenance plan
- [ ] Enroll a customer (use that test client email)
- [ ] Stripe Checkout opens on the contractor's connected account → use `4242`
- [ ] After checkout return: enrollment row populated with `stripe_subscription_id`
- [ ] Webhook fires `checkout.session.completed` → `plan_subscriptions.status` updates

### 2f. Marketing
- [ ] Marketing → Review Requests → select clients → send
- [ ] Real email arrives, footer has unsubscribe link, link works
- [ ] Verify `marketing_sends` row logged
- [ ] Marketing → Campaign → send a one-off to a single client
- [ ] List-Unsubscribe header present (check email source)

### 2g. Rate Library
- [ ] Settings → Rate Library → upload a real contractor rate sheet PDF
- [ ] Claude parses it → items appear in the library preview
- [ ] Save → items show up in quote/invoice line-item picker

### 2h. Tech sign-in
- [ ] Sign out of owner account
- [ ] Login screen → "Tech sign in" toggle
- [ ] Use the Tech ID you generated in 1e (before deleting) — actually re-create one for this test
- [ ] Sign in → tech sees limited dashboard
- [ ] Tech creates a quote → quote saves under owner's `owner_id` (RLS check)

### 2i. Google OAuth signup
- [ ] Sign out completely
- [ ] Click **Continue with Google** on signup
- [ ] Use a Google account whose email is on the allowlist
- [ ] OAuth completes → SignupScreen detects session → skips Step 0
- [ ] Finish Steps 1/2/3 → land in app, profile complete
- [ ] Verify same Stripe + Supabase state as 1b/1c

### 2j. Allowlist enforcement
- [ ] Sign out
- [ ] Try signing in with a Gmail NOT on the allowlist (via Google OAuth — easiest way to test)
- [ ] **Expected:** alert popup says "private preview…", user gets signed out, can't access app

---

## Part 3 — Edge cases worth a quick poke

- [ ] Forgot password flow (sends real Supabase email, link works, can set new password)
- [ ] Sign-in across two devices simultaneously (session refresh on both)
- [ ] Trial countdown shows correct days remaining on Dashboard billing widget
- [ ] Switch billing period (monthly → yearly) from Settings → Billing — Stripe sub updates with proration
- [ ] Cancel subscription from Settings → Billing — flips to `canceled` at period end, app still works during grace period

---

## Bug log (fill in during testing)

| # | Where it broke | What happened | Severity |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

---

## Post-test cleanup

- [ ] Delete test customer in Stripe (Customers → ⋯ → Delete)
- [ ] Delete test subscription if not auto-canceled with the customer
- [ ] Delete test profile in Supabase (`delete from profiles where email = '<test email>'` — cascades to other tables via FK)
- [ ] Delete test team_members rows
- [ ] Delete test clients/quotes/invoices/plans created during testing
- [ ] Refund any real-card charges through Stripe Dashboard (if you used a real card on the $49.99 plan)
