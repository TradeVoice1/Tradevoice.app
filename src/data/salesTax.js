// Sales-tax defaults loader.
//
// Source of truth is public.sales_tax_defaults (one row per state), kept
// current by api/cron/refresh-sales-tax.js. The cron asks Claude to parse
// each state's official sales-tax page once a week and writes the result
// here. The deterministic invoice/quote calc in App.jsx reads from this
// table — no AI at runtime, only at ingest.
//
// We cache the full table in memory on first read because:
//   - 51 rows, tiny payload (~3 KB)
//   - Read on every invoice / quote calc — Supabase round-trip per render
//     would be wasteful and add latency
//   - Data only changes once a week from the cron, so an in-memory cache
//     is plenty fresh for any single user session
//
// If the table is unreachable (network blip, RLS misconfigured, etc.)
// we fall back to the static defaults that ship with the bundle so
// invoicing keeps working. The fallback values mirror the seed in
// migration 0026 — if you change one, change both.
//
// Usage:
//   const tax = await getStateTaxDefaults('Texas');
//   // → { matTax: 6.25, laborTax: 6.25, laborNote: '…' }
//
//   // To force a refresh after Settings → Refresh Tax Data:
//   invalidateSalesTaxCache();

import { supabase } from "../supabase";

// In-memory cache. Populated on first call; flushed on demand.
let _cache = null;
let _loadingPromise = null;

// Fallback used when the DB query fails or before it returns. Mirrors
// the seed in supabase/migrations/0026_sales_tax_defaults.sql exactly.
const STATIC_FALLBACK = {
  'Alabama':         { matTax: 4.0,    laborTax: 0,     laborNote: '' },
  'Alaska':          { matTax: 0,      laborTax: 0,     laborNote: 'No statewide sales tax (local taxes may apply)' },
  'Arizona':         { matTax: 5.6,    laborTax: 5.6,   laborNote: 'Transaction privilege tax applies to repair/maintenance labor' },
  'Arkansas':        { matTax: 6.5,    laborTax: 0,     laborNote: '' },
  'California':      { matTax: 7.25,   laborTax: 0,     laborNote: 'Labor on real property improvement exempt' },
  'Colorado':        { matTax: 2.9,    laborTax: 0,     laborNote: '' },
  'Connecticut':     { matTax: 6.35,   laborTax: 0,     laborNote: '' },
  'Delaware':        { matTax: 0,      laborTax: 0,     laborNote: 'No sales tax (gross receipts tax applies to business)' },
  'Florida':         { matTax: 6.0,    laborTax: 0,     laborNote: 'Labor on real property improvement generally exempt' },
  'Georgia':         { matTax: 4.0,    laborTax: 0,     laborNote: '' },
  'Hawaii':          { matTax: 4.0,    laborTax: 4.0,   laborNote: 'GET applies to most services including contractor labor' },
  'Idaho':           { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Illinois':        { matTax: 6.25,   laborTax: 0,     laborNote: '' },
  'Indiana':         { matTax: 7.0,    laborTax: 0,     laborNote: '' },
  'Iowa':            { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Kansas':          { matTax: 6.5,    laborTax: 6.5,   laborNote: 'Labor installing tangible personal property is taxable' },
  'Kentucky':        { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Louisiana':       { matTax: 4.45,   laborTax: 0,     laborNote: '' },
  'Maine':           { matTax: 5.5,    laborTax: 0,     laborNote: '' },
  'Maryland':        { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Massachusetts':   { matTax: 6.25,   laborTax: 0,     laborNote: '' },
  'Michigan':        { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Minnesota':       { matTax: 6.875,  laborTax: 0,     laborNote: '' },
  'Mississippi':     { matTax: 7.0,    laborTax: 7.0,   laborNote: 'Labor on repair/maintenance taxable' },
  'Missouri':        { matTax: 4.225,  laborTax: 0,     laborNote: '' },
  'Montana':         { matTax: 0,      laborTax: 0,     laborNote: 'No sales tax' },
  'Nebraska':        { matTax: 5.5,    laborTax: 0,     laborNote: '' },
  'Nevada':          { matTax: 6.85,   laborTax: 0,     laborNote: '' },
  'New Hampshire':   { matTax: 0,      laborTax: 0,     laborNote: 'No sales tax' },
  'New Jersey':      { matTax: 6.625,  laborTax: 0,     laborNote: '' },
  'New Mexico':      { matTax: 5.0,    laborTax: 5.0,   laborNote: 'Gross receipts tax applies to labor and materials' },
  'New York':        { matTax: 4.0,    laborTax: 0,     laborNote: 'Labor on capital improvement exempt; repair labor taxable' },
  'North Carolina':  { matTax: 4.75,   laborTax: 0,     laborNote: '' },
  'North Dakota':    { matTax: 5.0,    laborTax: 0,     laborNote: '' },
  'Ohio':            { matTax: 5.75,   laborTax: 0,     laborNote: '' },
  'Oklahoma':        { matTax: 4.5,    laborTax: 0,     laborNote: '' },
  'Oregon':          { matTax: 0,      laborTax: 0,     laborNote: 'No sales tax' },
  'Pennsylvania':    { matTax: 6.0,    laborTax: 0,     laborNote: 'Construction labor on real property exempt' },
  'Rhode Island':    { matTax: 7.0,    laborTax: 0,     laborNote: '' },
  'South Carolina':  { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'South Dakota':    { matTax: 4.5,    laborTax: 4.5,   laborNote: 'Services broadly taxable including contractor labor' },
  'Tennessee':       { matTax: 7.0,    laborTax: 0,     laborNote: '' },
  'Texas':           { matTax: 6.25,   laborTax: 6.25,  laborNote: 'Labor taxable on repair/maintenance (not new construction)' },
  'Utah':            { matTax: 6.1,    laborTax: 0,     laborNote: '' },
  'Vermont':         { matTax: 6.0,    laborTax: 0,     laborNote: '' },
  'Virginia':        { matTax: 5.3,    laborTax: 0,     laborNote: '' },
  'Washington':      { matTax: 6.5,    laborTax: 6.5,   laborNote: 'Labor on tangible personal property installation taxable' },
  'West Virginia':   { matTax: 6.0,    laborTax: 6.0,   laborNote: 'Labor on construction services is taxable' },
  'Wisconsin':       { matTax: 5.0,    laborTax: 0,     laborNote: '' },
  'Wyoming':         { matTax: 4.0,    laborTax: 0,     laborNote: '' },
  'Washington D.C.': { matTax: 6.0,    laborTax: 0,     laborNote: '' },
};

// Convert a row from sales_tax_defaults (snake_case) into the camelCase
// shape App.jsx expects. The columns it cares about are mat_tax_rate,
// labor_tax_rate, labor_note — everything else is provenance metadata.
function rowToCamel(row) {
  return {
    matTax:    Number(row.mat_tax_rate)   || 0,
    laborTax:  Number(row.labor_tax_rate) || 0,
    laborNote: row.labor_note || '',
  };
}

// Loads the full table once, caches the result. Subsequent callers within
// the same session share the cached map. Returns the static fallback if
// the DB query fails so a Supabase outage doesn't break invoicing.
export async function loadSalesTaxDefaults() {
  if (_cache) return _cache;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('sales_tax_defaults')
        .select('state_name, mat_tax_rate, labor_tax_rate, labor_note');
      if (error) throw error;
      const map = {};
      for (const row of (data || [])) {
        map[row.state_name] = rowToCamel(row);
      }
      // Backfill any state missing from the DB (shouldn't happen, but
      // defensive — keeps lookups working if a row was deleted manually).
      for (const k of Object.keys(STATIC_FALLBACK)) {
        if (!map[k]) map[k] = STATIC_FALLBACK[k];
      }
      _cache = map;
      return map;
    } catch (e) {
      console.warn('[salesTax] DB load failed, using static fallback:', e?.message);
      _cache = STATIC_FALLBACK;
      return _cache;
    } finally {
      _loadingPromise = null;
    }
  })();
  return _loadingPromise;
}

// Convenience for a single state — used by the invoice/quote calc paths
// where a synchronous lookup is awkward to introduce. Triggers the table
// load on first call; subsequent calls are sync against the cache.
export async function getStateTaxDefaults(stateName) {
  if (!stateName) return { matTax: 0, laborTax: 0, laborNote: '' };
  const map = await loadSalesTaxDefaults();
  // Match the existing App.jsx behavior: forgiving substring match so
  // "Texas, USA" or "TX" all resolve to the Texas row.
  const key = Object.keys(map).find(k =>
    String(stateName).toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(String(stateName).toLowerCase())
  );
  return key ? map[key] : { matTax: 0, laborTax: 0, laborNote: '' };
}

// Force the next call to re-fetch from the DB. Used after the contractor
// hits a "Refresh from official sources" button (not yet wired) or after
// any manual override.
export function invalidateSalesTaxCache() {
  _cache = null;
  _loadingPromise = null;
}

// Exposed for tests + the eventual Settings → Tax page that wants to
// render a "showing data from May 19" provenance line.
export { STATIC_FALLBACK };
