# GoDaddy email forwarder setup — walkthrough

**Why this exists:** the Tradevoice marketing footer and the in-app Terms
of Service + Privacy Policy reference five support inboxes
(`support@`, `billing@`, `privacy@`, `legal@`, `security@`). Each one
needs to actually route somewhere before launch — a Terms-of-Service
reference to a dead email address is the kind of thing a plaintiff's
lawyer screenshots in a CCPA / billing-dispute case.

GoDaddy's free domain plan includes **unlimited email forwarders** (NOT
mailboxes — forwarders just redirect to an inbox you already own). All
the addresses below can be free forwarders that drop into your main
`matthew@thetradevoice.com` (or personal) inbox. No new mailboxes to
pay for.

---

## Addresses to create (in priority order)

| Address | Purpose | Already referenced in code? |
|---|---|---|
| `support@thetradevoice.com` | General user product help | ✅ Terms + Privacy + footer |
| `billing@thetradevoice.com` | Subscription / payment / invoice disputes / routine cancellations | ✅ Terms §5, §14 + footer |
| `privacy@thetradevoice.com` | CCPA / state-privacy-law requests, data exports, child-data reports | ✅ Privacy Policy §6, §13, §14 |
| `legal@thetradevoice.com` | DMCA notices, formal disputes, arbitration opt-out, account-termination records | ✅ Terms §14, §19, §20, §23 + footer |
| `security@thetradevoice.com` | Vulnerability reports, coordinated security disclosures | ✅ Terms + Privacy contact blocks |
| `abuse@thetradevoice.com` | Spam / phishing reports from outside hosts | Optional but RFC-standard |
| `noreply@thetradevoice.com` | FROM header on transactional emails (receipts, password resets) | Optional — outbound only |
| `hello@thetradevoice.com` | Public-facing general contact, early-access requests | ✅ Already exists (verify it still routes) |

---

## Step-by-step (GoDaddy classic dashboard, as of 2026)

### 1. Sign in
- Go to https://account.godaddy.com/products
- Sign in with your GoDaddy account. (If you don't remember which email
  owns the domain, look at the domain registration confirmation email —
  the account email is in the receipt.)

### 2. Find the email forwarding section
- In **My Products**, scroll to **Email & Office**.
- Find the `thetradevoice.com` row. It may show "Email Forwarding"
  with a **Manage** button, OR it may show "Set up" if you've never
  used GoDaddy email on this domain before.
- Click **Manage** (or **Set up**).

### 3. Create each forwarder
For EACH of the five priority addresses below, click **Create
Forward** (or **Add Forwarder**) and fill in:

| Field | Value |
|---|---|
| Forward this email address | `support` (just the prefix — the `@thetradevoice.com` part is auto-filled) |
| To these email addresses | `matthew@thetradevoice.com` (or whichever inbox you actually check daily) |

Repeat for `billing`, `privacy`, `legal`, `security`.

GoDaddy lets you put **multiple destinations** separated by commas if
you want, for example, `billing@` to copy both `matthew@` and a
future co-founder. Don't go overboard — fan-out makes inbox-zero
miserable.

### 4. Verify the destination address
- GoDaddy sends a one-time verification email to the destination
  inbox the first time you add it.
- Click the link in that email to authorize forwarding.
- After that, every new forwarder pointing to the same destination
  uses the cached verification — no re-verify needed.

### 5. Set the MX records (only if GoDaddy doesn't auto-do it)
- For forwarding to work, the domain's MX records must point to
  GoDaddy's mail servers.
- In **My Products → Domains → thetradevoice.com → DNS → Manage Zones**,
  look for entries that look like:
  ```
  MX  @  smtp.secureserver.net  Priority 0
  MX  @  mailstore1.secureserver.net  Priority 10
  ```
- If they're present, you're done.
- If they're missing or different, GoDaddy's setup wizard will offer
  to add them automatically when you save the first forwarder. Click
  **Apply** when it asks.

### 6. Test every forwarder
- From a personal Gmail / iCloud / Outlook account (NOT from
  `matthew@thetradevoice.com` — you can't easily test by sending to
  yourself), send a plain test email to each of the five addresses:
  - `support@thetradevoice.com`
  - `billing@thetradevoice.com`
  - `privacy@thetradevoice.com`
  - `legal@thetradevoice.com`
  - `security@thetradevoice.com`
- Each one should arrive in `matthew@thetradevoice.com` within ~1–2
  minutes. If anything bounces, the Terms-of-Service reference to that
  address is currently a broken promise — fix before deploying to
  production.

### 7. (Optional) Add auto-responders
- GoDaddy supports a per-forwarder auto-reply ("Auto-Forward Reply").
- Recommended for `support@` and `billing@`:
  > "Thanks for reaching out. We've received your message and will
  > respond within 24 business hours. — Tradevoice"
- This sets expectations and acts as a delivery confirmation for the
  sender.
- Skip auto-responders on `legal@`, `privacy@`, `security@` — those
  inboxes get formal notices where a stock auto-reply could be
  treated as an admission of receipt under a clock-running statute
  (DMCA, CCPA, etc.). Better to respond manually when there's
  actually something to respond to.

---

## What about real mailboxes later?

Forwarders are perfect for solo-founder phase. Once Tradevoice has
co-founders or a VA, the four "operational" inboxes (`support`,
`billing`, `privacy`, `legal`) should become **shared mailboxes** with
their own login + audit trail. Options:

- **Google Workspace** — $6/user/month, professional, easiest to add
  team members
- **Fastmail** — $5/user/month, no Google data-mining, good filtering
- **Zoho Mail** — has a free tier for up to 5 users, decent for
  budget-conscious early stage

Upgrade path: keep the same forwarder address (`support@thetradevoice.com`)
but change the destination from "matthew@..." to the shared mailbox.
No code changes needed; the Terms-of-Service references stay valid.

---

## Quick-reference: the bottom of all this

If you only do five things before launch, do these:

```
1. GoDaddy → Email & Office → Manage forwarders
2. Add: support → matthew@thetradevoice.com
3. Add: billing → matthew@thetradevoice.com
4. Add: privacy → matthew@thetradevoice.com    (verify legal@ + privacy@ still route)
5. Add: legal   → matthew@thetradevoice.com
6. Add: security → matthew@thetradevoice.com
7. Send test emails from a personal account; confirm all five arrive
```

Done in ~10 minutes. The Terms of Service and Privacy Policy promises
are real, the marketing footer links don't 404 anyone's email client,
and you've satisfied the inbox-discovery side of CCPA / state-privacy-law
compliance.
