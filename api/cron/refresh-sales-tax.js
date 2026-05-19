// GET /api/cron/refresh-sales-tax
//
// Vercel Cron entrypoint that keeps public.sales_tax_defaults current by
// asking Claude to read each state's official sales-tax page and extract
// the published base rate + contractor-labor taxability. The Vercel cron
// scheduler hits this endpoint on the schedule defined in /vercel.json
// (currently every Monday 03:00 UTC). Vercel cron requests include an
// `Authorization: Bearer ${CRON_SECRET}` header automatically when the
// env var is set, which we verify here so this isn't a public scrape
// endpoint anyone can spam.
//
// The architectural pattern matches Convergence Elite's federal/state
// payroll-tax refresh: Claude parses the published source documents into
// structured rows; the deterministic invoice engine consumes structured
// rows. No AI at runtime — only at ingest.
//
// Failure model: every state is attempted independently. A failure on
// one state (site down, HTML changed, Claude couldn't parse) logs to
// sales_tax_refresh_log with the error and moves on. The existing row
// in sales_tax_defaults stays put so invoicing keeps working with the
// most-recent good values. The audit log is the source of truth for
// "did we successfully refresh X this week?"
//
// Concurrency: we process states in batches of 4 with Promise.allSettled.
// Sequential = ~150-250s for 51 states (over Vercel Pro's 300s default
// timeout). Concurrency 4 keeps us at ~40-60s and well-mannered toward
// state government webservers.

import { getServiceClient } from "../_lib/supabase.js";
import { getAnthropic, DEFAULT_MODEL } from "../_lib/anthropic.js";

// Increase Vercel function maxDuration for this endpoint specifically —
// even at concurrency 4, 51 states × Claude round-trip can push 60s+.
// Vercel Pro allows up to 300s on cron functions.
export const config = { maxDuration: 300 };

// ── Source URL mapping ────────────────────────────────────────────────────────
// One entry per state. The URL should point to the page on the state's
// official tax-authority site where the current sales-tax rate is published.
// Where a state has a single canonical "current rate" page we use that;
// where the rate appears mid-page we still send the whole page to Claude
// and the tool-use prompt is precise enough to extract just what we need.
//
// States with no statewide sales tax (Alaska, Delaware, Montana, New
// Hampshire, Oregon) are intentionally absent — we skip them in the loop
// so we don't burn Claude cycles confirming "still zero". Their rows
// stay at 0/0 from the seed.
const STATE_SOURCES = {
  'Alabama':         'https://www.revenue.alabama.gov/sales-use/',
  'Arizona':         'https://azdor.gov/transaction-privilege-tax/tax-rate-table',
  'Arkansas':        'https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax/',
  'California':      'https://www.cdtfa.ca.gov/taxes-and-fees/rates.aspx',
  'Colorado':        'https://tax.colorado.gov/sales-use-tax',
  'Connecticut':     'https://portal.ct.gov/drs/sales-tax/tax-information',
  'Florida':         'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
  'Georgia':         'https://dor.georgia.gov/taxes/business-taxes/sales-use-tax',
  'Hawaii':          'https://tax.hawaii.gov/geninfo/get/',
  'Idaho':           'https://tax.idaho.gov/taxes/sales-use/',
  'Illinois':        'https://tax.illinois.gov/research/taxrates/sales.html',
  'Indiana':         'https://www.in.gov/dor/business-tax/sales-tax/',
  'Iowa':            'https://tax.iowa.gov/iowa-sales-and-use-tax-guide',
  'Kansas':          'https://www.ksrevenue.gov/salesratechanges.html',
  'Kentucky':        'https://revenue.ky.gov/Business/Sales-Use-Tax/Pages/default.aspx',
  'Louisiana':       'https://revenue.louisiana.gov/SalesTax',
  'Maine':           'https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax',
  'Maryland':        'https://www.marylandtaxes.gov/business/sales-use/index.php',
  'Massachusetts':   'https://www.mass.gov/sales-and-use-tax',
  'Michigan':        'https://www.michigan.gov/taxes/business-taxes/sales-use-tax',
  'Minnesota':       'https://www.revenue.state.mn.us/sales-and-use-tax',
  'Mississippi':     'https://www.dor.ms.gov/business/sales-tax',
  'Missouri':        'https://dor.mo.gov/business/sales/',
  'Nebraska':        'https://revenue.nebraska.gov/businesses/sales-and-use-tax',
  'Nevada':          'https://tax.nv.gov/Forms/General_Purpose_Forms/Sales_Tax_Map/',
  'New Jersey':      'https://www.state.nj.us/treasury/taxation/su.shtml',
  'New Mexico':      'https://www.tax.newmexico.gov/businesses/gross-receipts-overview/',
  'New York':        'https://www.tax.ny.gov/bus/st/stidx.htm',
  'North Carolina':  'https://www.ncdor.gov/taxes-forms/sales-and-use-tax',
  'North Dakota':    'https://www.tax.nd.gov/business/sales-and-use-tax',
  'Ohio':            'https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use',
  'Oklahoma':        'https://oklahoma.gov/tax/businesses/tax-types/sales-tax.html',
  'Pennsylvania':    'https://www.revenue.pa.gov/TaxTypes/SUT/Pages/default.aspx',
  'Rhode Island':    'https://tax.ri.gov/tax-sections/sales-excise/sales-and-use',
  'South Carolina':  'https://dor.sc.gov/tax/sales',
  'South Dakota':    'https://dor.sd.gov/businesses/taxes/sales-use-tax/',
  'Tennessee':       'https://www.tn.gov/revenue/taxes/sales-and-use-tax.html',
  'Texas':           'https://comptroller.texas.gov/taxes/sales/',
  'Utah':            'https://tax.utah.gov/sales',
  'Vermont':         'https://tax.vermont.gov/business/sales-and-use-tax',
  'Virginia':        'https://www.tax.virginia.gov/retail-sales-and-use-tax',
  'Washington':      'https://dor.wa.gov/taxes-rates/sales-and-use-tax-rates',
  'West Virginia':   'https://tax.wv.gov/Business/SalesAndUseTax/Pages/default.aspx',
  'Wisconsin':       'https://www.revenue.wi.gov/Pages/FAQS/pcs-sales.aspx',
  'Wyoming':         'https://revenue.wyo.gov/divisions/excise-tax/sales-and-use-tax',
  'Washington D.C.': 'https://otr.cfo.dc.gov/page/sales-and-use-tax-rates',
};

// Claude tool schema. The model is forced to call this exactly once with
// its extraction; no free-form prose can sneak through. Keeping the
// schema lean (3 numeric fields + a confidence enum + a note) makes it
// easy for Claude to get right even on a noisy page.
const TOOL_SCHEMA = {
  name: "report_state_sales_tax",
  description: "Report the current state sales tax rate and contractor-labor taxability from the official state tax page.",
  input_schema: {
    type: "object",
    properties: {
      mat_tax_rate: {
        type: "number",
        description: "Current STATE base sales tax rate on materials/tangible personal property, as a percentage (e.g. 6.25 for 6.25%, 5.6 for 5.6%). Do not include local/county/city add-ons. If the state has no statewide sales tax, return 0."
      },
      labor_tax_rate: {
        type: "number",
        description: "State sales tax rate that applies to CONTRACTOR LABOR specifically (services on real property). 0 in most states. Non-zero in states that broadly tax services (HI, NM) or that tax repair/maintenance labor specifically (AZ, KS, MS, SD, TX, WA, WV). When labor is taxable, return the same numeric rate as mat_tax_rate (e.g. 6.25 for Texas)."
      },
      labor_note: {
        type: "string",
        description: "One-sentence plain-English explanation of WHEN labor is or isn't taxable in this state. Examples: 'Labor taxable on repair/maintenance (not new construction)' for Texas. Empty string if labor_tax_rate is 0 and there's nothing nuanced to say."
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "How confident you are in this extraction. 'high' = the page clearly states the current rate. 'medium' = inferred from indirect language. 'low' = the page didn't have a clear rate and you're guessing. Anything below high will be flagged for manual review and won't auto-update the live row."
      },
      notes: {
        type: "string",
        description: "Anything worth recording for an auditor (e.g. 'Rate effective 2026-01-01 per top banner'). Keep brief; empty string is fine."
      }
    },
    required: ["mat_tax_rate", "labor_tax_rate", "labor_note", "confidence", "notes"]
  }
};

const SYSTEM_PROMPT = `You are a careful data extractor for a contractor invoicing platform.
You will be given the HTML of a US state's official sales-tax information page.
Extract the CURRENT state-level base sales tax rate and any nuances around how it applies to contractor labor.

Rules:
- Return only the STATE rate. Ignore county, city, and special-district add-ons.
- If the page lists a range (e.g. "5% state + up to 4% local"), return only the state portion.
- For labor: most states do NOT tax contractor labor on real-property improvements. If the page is silent on labor, assume labor_tax_rate = 0.
- If you can't find a clear rate on the page, set confidence to 'low' and explain in notes. Do not invent.
- Be conservative. The static fallback table is reasonable today; we only auto-update on confidence='high'.

Always call the report_state_sales_tax tool with your extraction.`;

// ── Concurrency helper ──────────────────────────────────────────────────────
async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        results[i] = { state: items[i][0], result: 'error', error_text: e?.message || String(e) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// ── Fetch + strip HTML to keep token cost reasonable ────────────────────────
// State tax pages are often 100k+ characters with menus, scripts, footers.
// Claude's context easily handles it but we'd burn 30-60k input tokens per
// state for content that's mostly chrome. Cheap mechanical strip: drop
// <script>, <style>, <nav>, <footer>, repeated whitespace. Brings most
// pages to ~5-10k chars without hurting Claude's accuracy.
async function fetchStripped(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Tradevoice tax-refresh cron (hello@thetradevoice.com)' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 60000); // hard cap so a runaway page can't blow the prompt
  } finally {
    clearTimeout(timeout);
  }
}

// ── Per-state worker ────────────────────────────────────────────────────────
async function refreshOne(supabase, anthropic, [stateName, url]) {
  const started = Date.now();
  const logBase = { state_name: stateName, source_url: url };

  // Pull the existing row so we can compare-and-update.
  const { data: existing } = await supabase
    .from('sales_tax_defaults')
    .select('mat_tax_rate, labor_tax_rate')
    .eq('state_name', stateName)
    .maybeSingle();

  let stripped;
  try {
    stripped = await fetchStripped(url);
  } catch (e) {
    await supabase.from('sales_tax_refresh_log').insert({
      ...logBase, result: 'fetch_failed', error_text: e?.message || String(e),
      duration_ms: Date.now() - started,
    });
    return { state: stateName, result: 'fetch_failed', error: e?.message };
  }

  let extracted;
  try {
    const msg = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'report_state_sales_tax' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `State: ${stateName}\nSource URL: ${url}\n\nPage content (HTML stripped):\n\n${stripped}` },
        ],
      }],
    });
    const toolUse = msg.content?.find(c => c.type === 'tool_use');
    if (!toolUse) throw new Error('no tool_use in response');
    extracted = toolUse.input || {};
  } catch (e) {
    await supabase.from('sales_tax_refresh_log').insert({
      ...logBase, result: 'parse_failed', error_text: e?.message || String(e),
      duration_ms: Date.now() - started,
    });
    return { state: stateName, result: 'parse_failed', error: e?.message };
  }

  const newMat   = Number(extracted.mat_tax_rate ?? 0);
  const newLabor = Number(extracted.labor_tax_rate ?? 0);
  const conf     = extracted.confidence || 'medium';
  const changed  = !existing ||
                   Math.abs(Number(existing.mat_tax_rate) - newMat) > 0.0001 ||
                   Math.abs(Number(existing.labor_tax_rate) - newLabor) > 0.0001;

  // Only auto-update on high-confidence extractions. Medium/low get logged
  // but the live row stays put — a human reviews via the log table.
  const shouldUpdate = conf === 'high';
  if (shouldUpdate) {
    await supabase
      .from('sales_tax_defaults')
      .update({
        mat_tax_rate:        newMat,
        labor_tax_rate:      newLabor,
        labor_note:          extracted.labor_note || '',
        source_url:          url,
        source_fetched_at:   new Date().toISOString(),
        claude_confidence:   conf,
        last_refreshed_at:   new Date().toISOString(),
        last_refresh_status: changed ? 'fresh' : 'unchanged',
        notes:               extracted.notes || null,
      })
      .eq('state_name', stateName);
  }

  await supabase.from('sales_tax_refresh_log').insert({
    ...logBase,
    result: shouldUpdate
      ? (changed ? 'ok_changed' : 'ok_unchanged')
      : (conf === 'low' ? 'parse_failed' : 'ok_unchanged'),
    previous_mat_rate:   existing?.mat_tax_rate ?? null,
    new_mat_rate:        newMat,
    previous_labor_rate: existing?.labor_tax_rate ?? null,
    new_labor_rate:      newLabor,
    claude_confidence:   conf,
    error_text:          conf === 'low' ? 'low confidence, not auto-updated' : null,
    duration_ms:         Date.now() - started,
  });

  return { state: stateName, result: shouldUpdate ? (changed ? 'updated' : 'unchanged') : 'skipped_low_conf', mat: newMat, labor: newLabor, conf };
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Vercel Cron sends GET with an Authorization header it derives from
  // process.env.CRON_SECRET. Reject anything else to keep this from being
  // a public Claude-spending endpoint. If CRON_SECRET isn't set we fall
  // back to a `?secret=` query param for local testing.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const header = req.headers['authorization'] || '';
    const query  = req.query?.secret;
    const ok = header === `Bearer ${expected}` || query === expected;
    if (!ok) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const supabase  = getServiceClient();
  const anthropic = getAnthropic();
  const startedAt = Date.now();

  const entries = Object.entries(STATE_SOURCES);
  const results = await runWithConcurrency(entries, 4, (entry) =>
    refreshOne(supabase, anthropic, entry)
  );

  const summary = {
    total:       results.length,
    updated:     results.filter(r => r?.result === 'updated').length,
    unchanged:   results.filter(r => r?.result === 'unchanged').length,
    skipped:     results.filter(r => r?.result?.startsWith('skipped')).length,
    fetch_failed: results.filter(r => r?.result === 'fetch_failed').length,
    parse_failed: results.filter(r => r?.result === 'parse_failed').length,
    error:       results.filter(r => r?.result === 'error').length,
    duration_ms: Date.now() - startedAt,
  };
  console.log('[refresh-sales-tax] summary', summary);

  return res.status(200).json({ ok: true, summary, results });
}
