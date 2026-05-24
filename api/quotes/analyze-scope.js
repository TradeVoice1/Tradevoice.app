// POST /api/quotes/analyze-scope
// Authorization: Bearer <supabase access token>
// Body: { storagePath: "<userId>/<filename>.pdf" }
//
// Elite-tier feature. Contractor uploads a scope PDF (blueprints, bid
// document, work order, insurance scope, etc.) to the scope-pdfs
// Supabase bucket from the browser, then calls this endpoint with the
// resulting path. We orchestrate a three-step AI chain:
//
//   1. Claude reads the PDF (vision-native) and extracts what's
//      actually in the document — line items, dimensions, materials,
//      work boundaries, special requirements.
//
//   2. Perplexity researches current building codes + industry-
//      standard line items for that type of work. Returns content
//      with citation URLs back to authoritative sources (IRC, NEC,
//      manufacturer specs, state board pages).
//
//   3. Claude synthesizes both outputs into a polished scope-of-work
//      paragraph + bulleted line items the contractor can paste
//      straight into the quote.
//
// Returns all three outputs so the front-end can render them in a
// three-panel preview (extraction / research / synthesis) before
// the contractor picks one to insert.
//
// Cost per analysis: ~$0.15-0.40 depending on PDF size. Logged for
// per-contractor rate limiting later if needed.

import { requireAuth } from "../_lib/requireAuth.js";
import { getServiceClient } from "../_lib/supabase.js";
import { getAnthropic, DEFAULT_MODEL } from "../_lib/anthropic.js";
import { perplexityChat } from "../_lib/perplexity.js";

// Function can take up to 90s on a big multi-page blueprint.
// Vercel Pro allows up to 300s, so plenty of headroom.
export const config = { maxDuration: 90 };

// Tier check inline — we don't have a server-side import of tier.js
// (that's front-end only). Mirrors the rules from src/lib/tier.js:
// only 'all' / 'all_yearly' / super_owner can use this feature.
function canUseAnalysis(profile) {
  if (profile?.is_super_owner) return true;
  const plan = String(profile?.plan || '').toLowerCase().replace(/_yearly$/, '');
  return plan === 'all';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Auth + Elite-tier gate.
  const auth = await requireAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const supabase = getServiceClient();
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('plan, is_super_owner')
    .eq('id', auth.userId)
    .maybeSingle();
  if (profErr) return res.status(500).json({ error: 'profile_lookup_failed' });
  if (!canUseAnalysis(profile)) {
    return res.status(403).json({
      error: 'elite_tier_required',
      detail: 'PDF scope analysis is an Elite-tier feature. Upgrade to use it.',
    });
  }

  const { storagePath } = req.body || {};
  if (!storagePath || typeof storagePath !== 'string') {
    return res.status(400).json({ error: 'missing_storage_path' });
  }
  // Validate the path starts with the caller's user ID — defense in
  // depth alongside the storage RLS policy. Prevents a contractor
  // from triggering analysis on someone else's PDF.
  if (!storagePath.startsWith(`${auth.userId}/`)) {
    return res.status(403).json({ error: 'path_not_owned_by_caller' });
  }

  // ── Step 0: download the PDF from storage ─────────────────────────
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('scope-pdfs')
    .download(storagePath);
  if (dlErr || !fileData) {
    console.error('[analyze-scope] download failed:', dlErr);
    return res.status(404).json({ error: 'pdf_not_found_or_download_failed' });
  }
  const arrayBuffer = await fileData.arrayBuffer();
  const base64Pdf   = Buffer.from(arrayBuffer).toString('base64');

  const anthropic = getAnthropic();

  try {
    // ── Step 1: Claude reads the PDF ─────────────────────────────────
    // Anthropic's native PDF support (via the document content block
    // type) handles multi-page documents up to ~32MB. Returns
    // text-based analysis using vision under the hood.
    const extractionResp = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: `You are reviewing a scope-of-work document for a construction contractor. Extract EVERYTHING that's actually in the document:

- Work scope items (what's being installed, repaired, replaced, demolished, etc.)
- Quantities + dimensions (sq ft, linear ft, count, etc. — be specific)
- Materials called out by name (brands, model numbers, sizes, grades)
- Exclusions / out-of-scope items
- Special requirements (permits, inspections, change-order language, deadlines)
- Site conditions / access notes
- Codes / standards explicitly referenced in the document

Format as plain text with section headers. Be CONCRETE — quote the document where possible. If you can't read part of the PDF (blurry, handwriting, etc.), say so explicitly rather than guessing. Don't add anything not in the document — that's the job of the second AI in the chain.`,
          },
        ],
      }],
    });
    const extraction = extractionResp.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // ── Step 2: Perplexity researches standards ──────────────────────
    // Feed Claude's extraction back to Perplexity so it knows what
    // kind of work to research. We ask it for current code references
    // + industry-standard line items + typical materials, with
    // citations.
    const research = await perplexityChat({
      messages: [{
        role: 'system',
        content: 'You are a construction code and standards researcher. Cite authoritative sources (IRC, NEC, ASHRAE, manufacturer datasheets, state board pages) by URL whenever possible. Be specific about code years and section numbers. Don\'t hallucinate code citations — if you\'re not certain a citation exists, say "consult your local jurisdiction" instead.',
      }, {
        role: 'user',
        content: `A contractor is preparing a quote for the work described below. Identify:

1. Relevant 2024-2026 building / electrical / plumbing / mechanical code requirements that apply to this scope.
2. Industry-standard line items, materials, and labor steps the contractor should include in the quote.
3. Common pitfalls or change-order triggers contractors miss on this type of job.

Cite sources with URLs. Be concise — a few bullet points per section.

Work described:
${extraction}`,
      }],
    });

    // ── Step 3: Claude synthesizes the two ──────────────────────────
    // Final pass takes both outputs and produces the scope-of-work
    // language the contractor will paste into the quote. Explicitly
    // tells Claude not to invent code citations — those come from
    // the Perplexity step only.
    const synthesisResp = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are writing a scope-of-work paragraph for a construction quote. You have two sources:

SOURCE A — Extracted from the customer's scope document (Claude vision):
${extraction}

SOURCE B — Current code + standards research (Perplexity with web citations):
${research.text}

Write a final scope of work that:
1. Starts with a 1-2 sentence summary of the job in plain language.
2. Includes a bulleted line-item list of specific work to be performed (use Source A's quantities and dimensions).
3. Notes any code requirements that affect the work (only those mentioned in Source B — do NOT invent additional code references).
4. Lists clear exclusions if Source A mentioned any.

Tone: professional, plain-spoken, no fluff. Format as plain text, not markdown. The contractor will paste this directly into a customer-facing quote.`,
      }],
    });
    const synthesis = synthesisResp.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    return res.status(200).json({
      ok: true,
      extraction,
      research:  research.text,
      citations: research.citations || [],
      synthesis,
    });
  } catch (e) {
    console.error('[analyze-scope] AI chain failed:', e);
    return res.status(500).json({
      error: 'analysis_failed',
      detail: e?.message || String(e).slice(0, 300),
    });
  }
}
