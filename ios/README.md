# Tradevoice iOS (Capacitor)

The iOS app is a Capacitor shell around the live web app. **There is no
separate iOS codebase** — every feature ships from `src/` exactly as on the
web, and web deploys update the iOS app instantly.

## Architecture decision: remote-URL shell

`capacitor.config.json` sets `server.url = https://app.thetradevoice.com`, so
the shell loads production directly (the QuickBooks/Slack model) instead of
bundling `dist/` into the binary. Why:

- Every API call in the app is **relative** (`/api/...`) and resolves against
  the Vercel deployment. Bundled assets would break them all (they'd resolve
  against `capacitor://localhost`) unless we introduced an API base URL.
- Web deploys reach iOS users immediately — no App Store release per fix.

If Apple review ever pushes back (guideline 4.2 "minimum functionality"),
the fallback is: add an `API_BASE` for `/api` calls, drop `server.url`, and
ship bundled assets. Strengthening the native case first (camera plugin for
job photos, push notifications) is the better move.

## What exists

- `capacitor.config.json` — app id `com.thetradevoice.app`, name "Tradevoice",
  navigation allow-list (Supabase, Stripe, Google/Apple OAuth).
- `ios/App` — the generated Xcode project (committed).
- Lion app icon + splash, generated into `Assets.xcassets` by
  `node scripts/gen-ios-assets.cjs && npx @capacitor/assets generate --ios`.

## What's left (blocked on the Apple Developer account)

1. Apple Developer enrollment ($99/yr) — developer.apple.com/programs/enroll
2. **Sign in with Apple** — required because Google sign-in exists.
   App ID capability in the Apple portal + Supabase Auth provider toggle +
   a button next to "Continue with Google".
3. **Codemagic** (codemagic.io) — cloud Mac build + signing from this repo
   (no Mac needed). Needs an App Store Connect API key from the enrolled
   account. Add `codemagic.yaml` then.
4. App Store Connect listing — screenshots, description, privacy labels.
   Account deletion (required) already ships in Settings.

## Day-to-day

Nothing. The shell only needs rebuilding when Capacitor itself or the icons
change — web work flows through automatically.
