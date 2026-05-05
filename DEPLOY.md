# Tradevoice — Production Deploy

**Architecture**: marketing at `thetradevoice.com`, app at `app.thetradevoice.com`. Both deploy from this same repo via two separate Vercel projects.

---

## One-time setup (~30 min)

### 1. Vercel account

1. Go to **https://vercel.com/signup** and sign in with GitHub.
2. Authorize Vercel to read the `TradeVoice1/Tradevoice.app` repo.

### 2. Project A — the React app (app.thetradevoice.com)

1. Vercel dashboard → **Add New** → **Project** → import `Tradevoice.app`.
2. Configure:
   - **Project Name**: `tradevoice-app`
   - **Framework Preset**: Vite *(auto-detected)*
   - **Root Directory**: `./` *(default — leave alone)*
   - **Build Command**: `npm run build` *(auto)*
   - **Output Directory**: `dist` *(auto)*
3. Click **Deploy**.
4. After it deploys, you'll get a URL like `tradevoice-app.vercel.app`. Verify the login screen loads.

### 3. Project B — the marketing site (thetradevoice.com)

1. Vercel dashboard → **Add New** → **Project** → import the same `Tradevoice.app` repo.
   *(Yes, same repo. Vercel allows it.)*
2. Configure:
   - **Project Name**: `tradevoice-marketing`
   - **Framework Preset**: **Other**
   - **Root Directory**: click **Edit** → set to `marketing` → **Continue**
   - **Build Command**: leave empty
   - **Output Directory**: `.` (single dot — current directory)
3. Click **Deploy**.
4. Verify the marketing landing page loads at `tradevoice-marketing.vercel.app`.

### 4. Wire the custom domains

#### In Vercel:

1. **tradevoice-app project** → Settings → Domains → Add `app.thetradevoice.com` → Vercel will show the DNS records you need to add.
2. **tradevoice-marketing project** → Settings → Domains → Add **both**:
   - `thetradevoice.com`
   - `www.thetradevoice.com` (Vercel auto-redirects www → root)

Vercel will tell you exactly what DNS records to create — write them down.

#### In GoDaddy DNS:

1. Sign in to GoDaddy → **My Products** → find `thetradevoice.com` → **DNS**.
2. **Delete the GoDaddy "Coming Soon" parking record** (usually a forwarding rule or a placeholder A record).
3. Add the records Vercel gave you. Typical setup:
   - **A record** → `@` → `76.76.21.21` *(Vercel's IP — confirm against what Vercel shows you)*
   - **CNAME** → `www` → `cname.vercel-dns.com`
   - **CNAME** → `app` → `cname.vercel-dns.com`
4. Save. DNS propagation takes 5-60 min. Vercel will show ✓ next to each domain when it's live.

### 5. Verify HTTPS

Once Vercel detects the DNS, it auto-provisions Let's Encrypt SSL certs (free, automatic renewal). All three URLs end up on HTTPS:

- ✅ `https://thetradevoice.com` → marketing
- ✅ `https://www.thetradevoice.com` → redirects to root
- ✅ `https://app.thetradevoice.com` → React app

---

## Ongoing workflow

### Every push to `main`

Both projects auto-deploy independently. Vercel only rebuilds the project whose files changed:
- Touch anything in `/marketing/**` → marketing redeploys
- Touch anything in `/src/**` → app redeploys
- Touch the README → neither rebuilds

### Preview deploys

Every PR/branch gets its own preview URL automatically. No setup needed.

### Rolling back

Vercel dashboard → project → Deployments → click any prior deploy → **Promote to Production**. Reverts in 30 seconds.

---

## Files involved

| File | What it does |
|---|---|
| `vercel.json` (root) | App config — SPA routing + asset caching |
| `marketing/index.html` | Marketing site landing page |
| `marketing/` (folder) | Future home of marketing assets (logo, OG image, etc.) |

---

## Things to do later (not blocking launch)

- **Open Graph image** — add `marketing/og-image.png` (1200×630) and a `<meta property="og:image">` tag for nicer social previews
- **Favicon** — `marketing/favicon.svg` (the app already has one at `/public/favicon.svg`, copy it over)
- **Real blog links** — three `Read more →` placeholders in the Blog section
- **Footer links** — Privacy, Terms, About, Contact all currently `href="#"`
- **Newsletter capture** — the email input at the bottom doesn't go anywhere yet; wire to Mailchimp/Resend when ready
- **Analytics** — Vercel Analytics is one click in the project settings, free for low traffic

---

## Reset / "I broke something"

If you ever want to start over: delete the Vercel project (no charge), re-import the repo, you're back where you started in ~3 minutes. DNS records can stay — they'll point at the new project once it's wired.
