-- =============================================================================
-- Tradevoice — AI-refreshed sales tax defaults (Layer 1)
-- =============================================================================
-- Up to this point the app shipped a single hand-curated static lookup table
-- (STATE_TAX_DEFAULTS in App.jsx) for state sales-tax + contractor-labor
-- rules. Rates drift over the year; manual maintenance lags reality.
--
-- This migration moves that lookup to a DB table that a weekly Vercel cron
-- (api/cron/refresh-sales-tax.js) keeps current by sending each state's
-- official sales-tax page to Claude and parsing the published rates +
-- contractor-labor taxability rules out into structured columns. The app
-- still ships the static table as a fallback so first-load works before
-- the cron has run, and so an outage on a state's site can't break invoicing.
--
-- This is the same pattern Convergence Elite uses for federal/state
-- payroll withholding tables (IRS Pub 15-T + each state's withholding
-- instructions) — Claude parses the official PDF/HTML, the deterministic
-- engine consumes structured rows.
-- =============================================================================

-- ── sales_tax_defaults — one row per US state + DC ──────────────────────────
-- Keyed by full state name to match the existing app convention. Rates
-- are stored as numeric(6,4) so we can represent something like 6.8750%
-- exactly without floating-point drift (Minnesota is 6.875%).
create table if not exists public.sales_tax_defaults (
  state_name              text primary key,
  -- State base rate on materials/equipment. 0 for no-sales-tax states (AK, DE, MT, NH, OR).
  mat_tax_rate            numeric(6,4) not null default 0,
  -- State rate on contractor labor. 0 in most states; non-zero in HI, AZ,
  -- KS, MS, NM, SD, TX (repair only), WA, WV. The app's invoice/quote calc
  -- only applies this when laborTax > 0.
  labor_tax_rate          numeric(6,4) not null default 0,
  -- Human-readable explanation of when/why labor is or isn't taxed.
  -- Shown in Settings → Tax Rates so contractors understand the default.
  labor_note              text default '',
  -- Bookkeeping for the cron pipeline.
  source_url              text,
  source_fetched_at       timestamptz,
  claude_confidence       text,        -- 'high' | 'medium' | 'low' | null
  last_refreshed_at       timestamptz,
  last_refresh_status     text,        -- 'fresh' | 'unchanged' | 'failed' | 'manual'
  notes                   text,        -- Free-form notes from the most recent Claude pass
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Read by anyone (these defaults are public reference data; no PII).
-- Writes only via service_role (the cron endpoint uses the service client).
alter table public.sales_tax_defaults enable row level security;

drop policy if exists "sales_tax_defaults: anyone read" on public.sales_tax_defaults;
create policy "sales_tax_defaults: anyone read"
  on public.sales_tax_defaults for select
  using (true);

drop trigger if exists set_updated_at on public.sales_tax_defaults;
create trigger set_updated_at before update on public.sales_tax_defaults
  for each row execute function public.set_updated_at();

-- ── sales_tax_refresh_log — audit trail for the cron pipeline ───────────────
-- Every run of the cron inserts one row per state attempted (success or
-- failure). Lets us answer "when did we last successfully refresh Texas?"
-- and "did anything change in this week's run?" without scraping logs.
create table if not exists public.sales_tax_refresh_log (
  id                      uuid primary key default uuid_generate_v4(),
  state_name              text not null,
  run_started_at          timestamptz not null default now(),
  source_url              text,
  -- Result categories:
  --   ok_changed   — Claude returned a value that differed from existing; we updated the row
  --   ok_unchanged — Claude returned a value that matched; only timestamps bumped
  --   skipped      — pre-flight check told us to skip (e.g. no source URL configured)
  --   fetch_failed — couldn't fetch the source URL (HTTP error)
  --   parse_failed — Claude couldn't return a usable tool_use response
  --   error        — unexpected exception
  result                  text not null,
  previous_mat_rate       numeric(6,4),
  new_mat_rate            numeric(6,4),
  previous_labor_rate     numeric(6,4),
  new_labor_rate          numeric(6,4),
  claude_confidence       text,
  error_text              text,
  duration_ms             integer
);

create index if not exists sales_tax_refresh_log_state_idx
  on public.sales_tax_refresh_log (state_name, run_started_at desc);
create index if not exists sales_tax_refresh_log_recent_idx
  on public.sales_tax_refresh_log (run_started_at desc);

alter table public.sales_tax_refresh_log enable row level security;

drop policy if exists "sales_tax_refresh_log: service role only" on public.sales_tax_refresh_log;
-- No anon/authenticated read policy — the audit log can hint at internal
-- prompts and confidence scores we don't need to expose in the front end.

-- ── Seed with current static table from App.jsx ─────────────────────────────
-- Values mirror STATE_TAX_DEFAULTS as of 2026-05-19. The cron will refresh
-- these on its first run. Using ON CONFLICT DO NOTHING so re-running the
-- migration is safe and we don't blow away values the cron has already
-- updated.
insert into public.sales_tax_defaults (state_name, mat_tax_rate, labor_tax_rate, labor_note, last_refresh_status) values
  ('Alabama',         4.0,    0,     '', 'manual'),
  ('Alaska',          0,      0,     'No statewide sales tax (local taxes may apply)', 'manual'),
  ('Arizona',         5.6,    5.6,   'Transaction privilege tax applies to repair/maintenance labor', 'manual'),
  ('Arkansas',        6.5,    0,     '', 'manual'),
  ('California',      7.25,   0,     'Labor on real property improvement exempt', 'manual'),
  ('Colorado',        2.9,    0,     '', 'manual'),
  ('Connecticut',     6.35,   0,     '', 'manual'),
  ('Delaware',        0,      0,     'No sales tax (gross receipts tax applies to business)', 'manual'),
  ('Florida',         6.0,    0,     'Labor on real property improvement generally exempt', 'manual'),
  ('Georgia',         4.0,    0,     '', 'manual'),
  ('Hawaii',          4.0,    4.0,   'GET applies to most services including contractor labor', 'manual'),
  ('Idaho',           6.0,    0,     '', 'manual'),
  ('Illinois',        6.25,   0,     '', 'manual'),
  ('Indiana',         7.0,    0,     '', 'manual'),
  ('Iowa',            6.0,    0,     '', 'manual'),
  ('Kansas',          6.5,    6.5,   'Labor installing tangible personal property is taxable', 'manual'),
  ('Kentucky',        6.0,    0,     '', 'manual'),
  ('Louisiana',       4.45,   0,     '', 'manual'),
  ('Maine',           5.5,    0,     '', 'manual'),
  ('Maryland',        6.0,    0,     '', 'manual'),
  ('Massachusetts',   6.25,   0,     '', 'manual'),
  ('Michigan',        6.0,    0,     '', 'manual'),
  ('Minnesota',       6.875,  0,     '', 'manual'),
  ('Mississippi',     7.0,    7.0,   'Labor on repair/maintenance taxable', 'manual'),
  ('Missouri',        4.225,  0,     '', 'manual'),
  ('Montana',         0,      0,     'No sales tax', 'manual'),
  ('Nebraska',        5.5,    0,     '', 'manual'),
  ('Nevada',          6.85,   0,     '', 'manual'),
  ('New Hampshire',   0,      0,     'No sales tax', 'manual'),
  ('New Jersey',      6.625,  0,     '', 'manual'),
  ('New Mexico',      5.0,    5.0,   'Gross receipts tax applies to labor and materials', 'manual'),
  ('New York',        4.0,    0,     'Labor on capital improvement exempt; repair labor taxable', 'manual'),
  ('North Carolina',  4.75,   0,     '', 'manual'),
  ('North Dakota',    5.0,    0,     '', 'manual'),
  ('Ohio',            5.75,   0,     '', 'manual'),
  ('Oklahoma',        4.5,    0,     '', 'manual'),
  ('Oregon',          0,      0,     'No sales tax', 'manual'),
  ('Pennsylvania',    6.0,    0,     'Construction labor on real property exempt', 'manual'),
  ('Rhode Island',    7.0,    0,     '', 'manual'),
  ('South Carolina',  6.0,    0,     '', 'manual'),
  ('South Dakota',    4.5,    4.5,   'Services broadly taxable including contractor labor', 'manual'),
  ('Tennessee',       7.0,    0,     '', 'manual'),
  ('Texas',           6.25,   6.25,  'Labor taxable on repair/maintenance (not new construction)', 'manual'),
  ('Utah',            6.1,    0,     '', 'manual'),
  ('Vermont',         6.0,    0,     '', 'manual'),
  ('Virginia',        5.3,    0,     '', 'manual'),
  ('Washington',      6.5,    6.5,   'Labor on tangible personal property installation taxable', 'manual'),
  ('West Virginia',   6.0,    6.0,   'Labor on construction services is taxable', 'manual'),
  ('Wisconsin',       5.0,    0,     '', 'manual'),
  ('Wyoming',         4.0,    0,     '', 'manual'),
  ('Washington D.C.', 6.0,    0,     '', 'manual')
on conflict (state_name) do nothing;

notify pgrst, 'reload schema';
