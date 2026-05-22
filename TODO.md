# Tradevoice — deferred work

Things that have been explicitly punted to a later session, with enough context
to pick up cold. Update this as we go.

---

## 🆕 Captured during 2026-05-21 testing + audit day

A long session that shipped Phases 1-6 of the founder dashboard, the
per-state license system, a comprehensive security audit + remediation,
and a bunch of UX fixes. Listed here in priority order — new items
surfaced during testing or by the audit:

### 🟡 Webhook → DB pipeline gap on pre-migration-0035 accounts

Jamie's first signup (before migration 0035 was run in production) ended
up with `stripe_customer_id` and `stripe_subscription_id` populated but
`current_period_end`, `cancel_at_period_end`, and `plan` all NULL. The
webhook event existed in Stripe but our UPDATE silently no-op'd those
columns because they didn't exist in the schema yet.

After he signed up fresh post-migration the same fields populated
correctly, so the pipeline is healthy going forward. But ANY account
created between the Phase-3 launch and the migration 0035 deploy has
this gap. Nothing breaks in the dashboard — those rows just show
"—" everywhere — but cancellation tracking can't work on those old
accounts.

**Options:**
1. Accept the gap (these are pre-launch test accounts; wipe them
   manually as you find them). Lowest effort.
2. Build a one-time Stripe Events API backfill script that hydrates
   the missing columns for accounts where `current_period_end` is
   NULL. ~1 hour. Worth doing if you have customers in this state
   when you open the allowlist.

### 🟡 Cron secret hard-fail (audit finding, MEDIUM)

`api/cron/refresh-sales-tax.js` lines 315-323 check `CRON_SECRET` via
header OR query-param fallback, but if the env var is unset the
endpoint has no enforcement at all — it'd be publicly callable. Vercel
cron always sets the header so it's theoretical in production, but
worth tightening to a hard fail. ~10 min.

### 🟡 Founder TOTP recovery flow

If you lose your phone + the base32 secret backup, the only recovery
path is direct SQL editor access (UPDATE the secret columns to NULL,
re-enroll). Pre-launch when you're the only super-owner this is fine.
Post-launch (if you ever delegate super-owner to a second person, or
just want belt-and-suspenders) consider:

1. **Backup codes** — generate 10 one-time codes at TOTP setup, store
   bcrypt hashes on the profile, accept any unused code as a one-shot
   unlock. ~1 hour.
2. **Magic-link bypass** — Supabase emails a one-time link that
   unlocks the gate. Tied to the auth email — if THAT's compromised
   too you have bigger problems. ~45 min.

### 🟢 URL validation on Google Review Link

Settings → Edit Profile → Google Review Link accepts any string and
sends it as-is in marketing emails. If a contractor pastes garbage
they break their own customer emails (self-inflicted) but a regex
check would catch the typo case. ~5 min.

### 🟢 Webhook error log verbosity (audit finding, LOW)

`api/stripe/webhook.js` logs raw error messages on signature
verification failure. Minor info leak in your own Vercel logs only.
~5 min cosmetic.

### 🟢 Stripe callback O(N) state lookup (audit finding, LOW)

`api/stripe/callback.js` verifies the OAuth state nonce by paginating
across all users (acknowledged tech debt in a code comment). Works
correctly today; scales poorly past ~10k accounts. Build the proper
short-TTL state table when needed.

### 🟢 Subscription events historical backfill

`subscription_events` table only logs events from migration 0034
onward. Old payment history isn't there. The dashboard timeline
shows "no events recorded yet" for accounts whose history predates
that migration. Stripe's Events API can fill this in — ~1 hour
script. Skip unless you have customers asking for older history.

### 🟢 Marketing send: server-side email format validation

`api/marketing/send.js` doesn't validate that the recipient's
client.email actually looks like an email. If a contractor's clients
table has bad data, Resend will reject and the row gets logged as
'failed'. Mild — adds a "tell me why before I burn the API call"
check. ~10 min.

### 🟢 Existing accounts missing state field

The state-picker fix landed mid-session; accounts that signed up
between the founder bypass shipping and the state-picker shipping
might have empty `states` arrays. Query to find them:

```sql
select u.email, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
 where coalesce(p.role, 'owner') = 'owner'
   and not p.is_super_owner
   and (p.states is null or array_length(p.states, 1) is null);
```

If anyone shows up, either patch via SQL (`update profiles set
states = ARRAY['Whatever'] where id = ...`) or wipe + ask them to
re-sign-up. The state-picker is now enforced for new signups.

---

## ✅ Shipped 2026-05-21

Today's wins, for the record:

- **Founder dashboard end-to-end** — Phases 1-6 of the "god view":
  - Migration 0030: `is_super_owner` flag + RLS extensions
  - Migration 0031: dashboard data RPC
  - Migration 0032: trigger lockdown on super-owner columns
  - Migration 0034: subscription_events table + timeline RPC
  - Migration 0035: cancel-clicked tracking + activity counts
  - Migration 0036: revenue refocus (lifetime $, MRR, monthly $)
  - Founder TOTP gate (Phase 2) — full-screen takeover before render
  - Click-to-sort dashboard columns + alphabetical sort default
  - Per-customer drill-down with full event timeline + revenue banner

- **Per-state license + tax (multi-state contractors)** —
  Migration 0033: per-invoice/per-quote `state` column.
  Migration 0037: `profiles.state_licenses` JSONB + per-document
  `license_number` snapshot. State picker in invoice/quote editor
  auto-pulls the matching license. Profile editor has chip-based
  multi-state picker + per-state license inputs.

- **🔒 Auth correlation on body-driven endpoints (was in TODO 2026-05-15) — DONE.**
  Built `api/_lib/requireAuth.js` + `src/lib/authedFetch.js`.
  Applied to all 8 affected endpoints: stripe/disconnect, setup-intent,
  connect-start, create-subscription (all 3 actions),
  plan-checkout, plan-cancel-subscription, marketing/send (both
  flows), library/parse-rate-table. Each endpoint now validates
  the Bearer JWT, asserts body.userId matches the authenticated
  user_id. IDOR loophole closed.

- **Schedule UX improvements:**
  - "Needs Rescheduling" sidebar section + header badge for overdue jobs
  - Rich JobDatePicker (month grid + job-density dots) in both Add Job
    AND Reschedule flows
  - Drag-reschedule confirm prompt
  - Monthly folders for past jobs in Jobs list
  - JOB-XXXX numbers stamped on invoices (migration 0029)
  - Quote → schedule-job flow (pendingJobDraft pattern)

- **Signup state picker fix** — was hardcoded to 'Texas', no UI to
  change it, no validation. Now shows a state dropdown on Step 1,
  requires selection before Continue. Plus cleaned up the
  `[user.state || 'Texas']` fallback in Settings → Tax Rates.

- **Profile input focus loss (14 fields)** — `F` form wrapper was
  defined inside ProfileModal, causing re-mount on every keystroke.
  Hoisted to module scope. Click → type → move on, as intended.

- **Marketing site Sign In / Create Account CTAs** — added /?signin=1
  and /?signup=1 URL params that force a fresh auth flow (sign out
  any existing session). New "Create Account" outlined button in
  the marketing top nav + footer.

- **Edit Profile full-page on laptop** — was a cramped 720px modal,
  too small once the multi-state license editor landed. Now full-
  viewport scrollable container with centered 1100px reading
  column. Tablet/phone unchanged.

- **Founder bypass for Billing page** — was displaying "Solo —
  $49.99/mo" for the founder due to the `getPrice(trades.length ||
  1)` fallback. Now shows clean "Founder Account · No plan · No
  subscription · No charges" panel.

- **State + License auto-pair on invoices/quotes** — switching the
  Job State dropdown auto-fills the matching license number from
  profile.stateLicenses. Manual override respected if you type
  something custom.

- **Comprehensive security audit** — full RLS + SECURITY DEFINER +
  API endpoint scan. Zero database-layer holes found. Eight API
  endpoint IDOR issues found and fixed (above). Remaining items
  are MEDIUM/LOW severity polish (above).

---

## ✅ Founder email fallback — SHIPPED 2026-05-21

Both hardcoded `mattparnellburkes@yahoo.com` fallbacks (DeveloperPanel
+ EARLY_ACCESS_EMAILS) replaced with `''` in commit on 2026-05-21
late-night batch. The allowlist now defaults to EMPTY if
VITE_EARLY_ACCESS_EMAILS is unset — set it explicitly in Vercel
env vars for every environment.

---

## ✅ Auth correlation on body-driven endpoints — SHIPPED 2026-05-21

Was: 8 API endpoints accepted `userId`/`ownerId` from request body
without validating it matched the caller's JWT — IDOR risk that
could allow disconnecting any Stripe Connect, spamming any owner's
client list, or burning Claude API credits on someone else's
behalf.

Shipped during the 2026-05-21 audit (`api/_lib/requireAuth.js` +
`src/lib/authedFetch.js`). All 8 affected endpoints now validate
Bearer JWT and reject body-claimed user IDs that don't match.

---

## ⏱️ Campaign timeout on >150-recipient blasts (added 2026-05-15)

`api/marketing/send.js handleCampaign` sends emails in a synchronous
for-loop, awaiting each Resend call before the next. Vercel Hobby
caps serverless functions at 60s; at ~250ms per Resend round-trip,
that's ~240 recipients max before the function dies mid-loop. Half
the campaign lands, half doesn't, the marketing_campaigns row is
left in `sending` status (never gets the final `update to 'sent'`),
and there's no resume mechanism.

**Fix options (rank by effort):**
1. **Promise.all in batches of 20** with `Promise.allSettled` — easy
   ~10-line change, lifts cap to ~4000 recipients in 60s. Best
   immediate fix.
2. **Move to Vercel Cron + a job queue table** — proper solution.
   Endpoint just queues; cron drains. Requires Vercel Pro (blocked
   below) and the recurring-jobs cron infrastructure.
3. **Stream chunked progress back via SSE** — overkill for now.

Option 1 first; Option 2 once Pro is live.

Not blocking private preview (no real contractor has >100 clients in
their address book yet). Important before launch.

---

## ✅ Stripe Connect entity-type prefill — SHIPPED 2026-05-21

Was: hardcoded `stripe_user[business_type]=company` which prefilled
LLC/Corp onboarding for everyone, even sole-prop contractors (who'd
prefer SSN+DOB to EIN+business address).

Fix shipped: server now reads optional `entityType` from request body
and only prefills when it's `'individual'` or `'company'`. Missing
or unknown values → omit the prefill entirely so Stripe asks. Front-
end doesn't currently send the param so we hit the safe "ask Stripe"
path by default.

Future enhancement (not tonight): collect business-entity type in a
new Profile field, pass it through connect-start call. Until then,
"Stripe asks" is the right default.

---

## 🧪 Pre-launch testing day (added 2026-05-15)

Pick one focused day before opening the allowlist beyond the founder
to run the full end-to-end test pass. Checklist + bug log lives in
**`TESTING.md`** at the repo root — open that doc and run it
top-to-bottom in one sitting (~3-4 hrs).

**Top priority inside that doc:** Part 1 — the Stripe live-mode smoke
test. We activated live mode + added env vars + fixed the webhook
secret typo, but we never actually ran a real card through the
pipeline. Until that's green we can't confidently invite anyone.

When this day happens, also knock out the blockers in `TESTING.md`'s
pre-flight (allowlist test email, Supabase migration check, etc.) and
schedule a separate bug-fix day for anything that surfaces.

---

## ✅ Tech-seat add-on (SHIPPED — moved out of deferred 2026-05-15)

Wired during the session that added the Elite tier rename. The
"new endpoint" plan in the original deferral was scrapped in favor of
consolidating into `api/stripe/create-subscription.js` as a multi-action
dispatcher to stay under the Vercel Hobby 12-function cap:

- `POST /api/stripe/create-subscription` with `action='sync_seats'` reads
  the contractor's active `team_members` count, subtracts the plan's
  included seats (Elite gets 2 free), and updates the Stripe sub's
  tech-seat line item to match the billed quantity (add / update /
  remove with proration).
- `src/data/team.js` exports `syncTechSeats(ownerId)`; called after
  every team_member add (createTechAccount) and remove (deleteTeamMember).
- Idempotent — safe to call repeatedly.

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

## 1. Card-on-file at signup (Stripe SetupIntent) — ✅ DONE

Shipped end-to-end: migration 0015 added the columns, `api/stripe/setup-intent.js`
+ `api/stripe/create-subscription.js` provide the back-end, SignupScreen Step 3
mounts Stripe Elements PaymentElement, creates the trialing Subscription, and
persists `stripe_customer_id` / `stripe_subscription_id` / `subscription_status`
/ `trial_ends_at` on the profile. ToS checkbox on Step 2 covers the auto-renew
clause (LegalScreens.jsx → TermsScreen section 4).

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
