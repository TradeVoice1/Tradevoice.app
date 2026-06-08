// POST /api/account/delete
// Body: { confirm: "DELETE" }
//
// Permanently deletes the AUTHENTICATED user's account. This is the
// App-Store-required (and just-good-practice) self-service account deletion:
//   1. Cancel the user's Tradevoice (platform) subscription so billing stops.
//   2. Best-effort purge of their Storage files (logos, job photos, scope PDFs)
//      — Storage isn't covered by the DB cascade.
//   3. Delete the auth user, which ON DELETE CASCADE removes every owned row
//      (profiles, clients, quotes, invoices, jobs, team rows, etc.). If the
//      user is a tech on someone else's team, those FKs are ON DELETE SET NULL,
//      so the owner's data is untouched — only the tech's link is severed.
//
// We deliberately do NOT delete the contractor's own Stripe Connect account —
// that belongs to them and may hold payout / tax history they're legally
// required to keep. We only stop our platform billing and drop our data.

import { stripe } from "../_lib/stripe.js";
import { getServiceClient } from "../_lib/supabase.js";
import { requireAuth } from "../_lib/requireAuth.js";

// Empty a user's folder in a bucket (one level of nesting deep — covers flat
// layouts like company-logos/<uid>/… and nested ones like
// job-photos/<uid>/<jobId>/…). Fully guarded; never throws.
async function purgeUserStorage(supabase, bucket, userId) {
  try {
    const { data: top } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (!top || !top.length) return;
    const files = [];
    for (const entry of top) {
      if (entry.id) {
        files.push(`${userId}/${entry.name}`);            // a file
      } else {
        const { data: sub } = await supabase.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
        for (const f of (sub || [])) {
          if (f.id) files.push(`${userId}/${entry.name}/${f.name}`);
        }
      }
    }
    if (files.length) await supabase.storage.from(bucket).remove(files);
  } catch (e) {
    console.warn(`[account/delete] storage purge (${bucket}) failed, continuing:`, e?.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Delete the AUTHENTICATED user only — no userId is read from the body,
  // so there's no way to delete anyone else's account.
  const auth = await requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const userId = auth.userId;

  // Defense-in-depth confirmation (the UI also makes the user type DELETE).
  if ((req.body?.confirm || '') !== 'DELETE') {
    return res.status(400).json({ error: 'confirmation_required' });
  }

  const supabase = getServiceClient();

  // 1. Cancel the platform subscription so the user stops being billed.
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (e) {
        console.warn('[account/delete] subscription cancel failed, continuing:', e?.message);
      }
    }
  } catch (e) {
    console.warn('[account/delete] profile lookup failed, continuing:', e?.message);
  }

  // 2. Best-effort Storage cleanup (not covered by the DB cascade).
  for (const bucket of ['company-logos', 'job-photos', 'scope-pdfs']) {
    await purgeUserStorage(supabase, bucket, userId);
  }

  // 3. Delete the auth user → cascades all owned DB rows.
  const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error('[account/delete] auth user delete failed:', delErr);
    return res.status(500).json({ error: 'delete_failed', detail: delErr.message });
  }

  return res.status(200).json({ ok: true });
}
