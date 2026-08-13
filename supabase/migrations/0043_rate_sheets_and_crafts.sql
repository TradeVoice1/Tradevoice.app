-- Tradevoice — Rate System, Phase 1: sheets, build-ups, burden lines, crafts,
-- equipment.
-- =============================================================================
-- Modeled function-for-function on a real industrial contractor's estimating
-- workbook (Burkes Mechanical "Bid Form_2026", reviewed 2026-08-09) and
-- verified against it to the penny. The facts of that workbook drive this
-- schema:
--
--   1. A rate is BUILT, not typed: base wage + burden lines (each a % of the
--      wage) + overhead % + profit %, all taken ON THE BASE WAGE and summed —
--      additive, never compounded. Foreman I: 44 x (1 + (51.12+10+15)/100)
--      = $77.4928. Compounding the same inputs gives $83.11 — a phantom $6/hr.
--
--   2. Overtime and double time are their own build-ups on a PORTION of the
--      wage (OT = half portion, DT = full portion), each with its own burden
--      set: the workbook zeroes workers' comp, safety/PPE and small tools on
--      premium time and takes no overhead there. Hence three applies_* flags
--      per line and per-portion overhead/profit on the group.
--
--   3. Burden lines are ROWS, not columns. Every company structures its rate
--      differently — one shop counts small tools as burden, the next buries
--      it in overhead. There is NO fixed burden list in the product; the math
--      engine only ever sees (name, pct, which portions). Starter templates
--      live in the client (src/data/rates.js) and simply insert rows; after
--      that the owner owns every line.
--
--   4. A sheet carries two (or more) build-up GROUPS — Direct labor and
--      Indirect labor — each with its own crafts, wages and burden lines
--      (the workbook even uses different GL: 8.25% direct, 8.33% indirect).
--      Crew quantities/hours per craft produce the manpower composite;
--      both groups blend into the project composite.
--
--   5. Per diem is billed ($137.50/day) and paid ($125/day) at different
--      numbers, with a weekly rate ($825) that kicks in past 7 days.
--
-- Design decisions vs the earlier draft of this migration:
--   - Crafts live per-group (name + wage + crew plan in one row), exactly like
--     the workbook's build-up columns. A universal owner-level craft list can
--     be layered on later for tech linkage without touching this schema.
--   - No rate_templates table: templates are client-side constants that
--     insert rows. Nothing in the DB is product-owned.
--
-- RLS: owner-only on all five tables. Phase 1 is entirely owner/admin-facing;
-- tech read access arrives with quote integration (Phase 3) as a narrow view
-- that exposes rates but never wages or burden.
-- =============================================================================

-- ── Sheets ───────────────────────────────────────────────────────────────────
create table if not exists public.rate_sheets (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  client_id     uuid references public.clients(id) on delete set null,
  project_ref   text,
  effective_on  date not null default current_date,
  revision      text,
  -- Revision chain: a re-issued sheet points at the one it supersedes, so
  -- "which sheet priced this quote" stays answerable forever.
  parent_id     uuid references public.rate_sheets(id) on delete set null,
  is_default    boolean not null default false,
  status        text not null default 'draft'
                check (status in ('draft','active','superseded')),

  -- Per diem (workbook: billed 137.50 / paid 125 / weekly 825 / 10-hr days)
  per_diem_daily        numeric(10,2),
  per_diem_paid         numeric(10,2),
  per_diem_weekly       numeric(10,2),
  per_diem_hours_per_day numeric(5,2) not null default 10,

  -- Cost-plus markup by category (workbook: everything at cost + 10%)
  markup_materials numeric(6,2) not null default 10,
  markup_subs      numeric(6,2) not null default 10,
  markup_rentals   numeric(6,2) not null default 10,
  markup_specialty numeric(6,2) not null default 10,

  -- Ordered list of term strings printed on the client sheet. Copied from a
  -- template at creation, then owner-edited — never product-owned.
  terms      jsonb not null default '[]'::jsonb,
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists rate_sheets_owner_idx
  on public.rate_sheets (owner_id, status, effective_on desc);
create index if not exists rate_sheets_client_idx
  on public.rate_sheets (owner_id, client_id);
-- At most one default sheet per owner.
create unique index if not exists rate_sheets_one_default
  on public.rate_sheets (owner_id) where is_default;

-- ── Build-up groups (Direct labor / Indirect labor / custom) ─────────────────
create table if not exists public.rate_groups (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  sheet_id    uuid not null references public.rate_sheets(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  -- Per-portion overhead and profit, percentages of the portion's wage base.
  oh_st       numeric(6,2) not null default 0,
  oh_ot       numeric(6,2) not null default 0,
  oh_dt       numeric(6,2) not null default 0,
  profit_st   numeric(6,2) not null default 0,
  profit_ot   numeric(6,2) not null default 0,
  profit_dt   numeric(6,2) not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rate_groups_sheet_idx
  on public.rate_groups (sheet_id, sort_order);
create index if not exists rate_groups_owner_idx on public.rate_groups (owner_id);

-- ── Burden lines: unlimited, owner-defined rows ──────────────────────────────
create table if not exists public.rate_burden_lines (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  group_id    uuid not null references public.rate_groups(id) on delete cascade,
  name        text not null default '',
  pct         numeric(7,3) not null default 0,
  applies_st  boolean not null default true,
  applies_ot  boolean not null default true,
  applies_dt  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rate_burden_lines_group_idx
  on public.rate_burden_lines (group_id, sort_order);
create index if not exists rate_burden_lines_owner_idx
  on public.rate_burden_lines (owner_id);

-- ── Crafts: one row per craft per group — wage + crew plan together ──────────
create table if not exists public.rate_crafts (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  group_id    uuid not null references public.rate_groups(id) on delete cascade,
  name        text not null default '',
  -- Printed under the craft on the client sheet: "electrician, pipe fitter..."
  definition  text,
  wage        numeric(10,2) not null default 0,
  -- Manpower-composite crew plan (workbook rows 44-47)
  qty         integer      not null default 0,
  st_hours    numeric(6,2) not null default 40,
  ot_hours    numeric(6,2) not null default 10,
  dt_hours    numeric(6,2) not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rate_crafts_group_idx
  on public.rate_crafts (group_id, sort_order);
create index if not exists rate_crafts_owner_idx on public.rate_crafts (owner_id);

-- ── Equipment schedule: sparse tiers — null means "not priced that way" ──────
create table if not exists public.rate_equipment (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  sheet_id    uuid not null references public.rate_sheets(id) on delete cascade,
  name        text not null default '',
  note        text,          -- 'operated · 8 hr minimum · portal to portal'
  hourly      numeric(10,2),
  daily       numeric(10,2),
  weekly      numeric(10,2),
  monthly     numeric(10,2),
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rate_equipment_sheet_idx
  on public.rate_equipment (sheet_id, sort_order);
create index if not exists rate_equipment_owner_idx
  on public.rate_equipment (owner_id);

-- ── Provenance: which sheet priced a quote/invoice ───────────────────────────
-- The resolved rate is still COPIED onto each line at pricing time — a quote
-- is a price given on a date, and re-issuing a sheet must never rewrite one.
alter table public.quotes
  add column if not exists rate_sheet_id uuid references public.rate_sheets(id) on delete set null;
alter table public.invoices
  add column if not exists rate_sheet_id uuid references public.rate_sheets(id) on delete set null;

-- ── RLS: owner-only, all five tables ─────────────────────────────────────────
alter table public.rate_sheets       enable row level security;
alter table public.rate_groups       enable row level security;
alter table public.rate_burden_lines enable row level security;
alter table public.rate_crafts       enable row level security;
alter table public.rate_equipment    enable row level security;

do $rls$
declare t text;
begin
  foreach t in array array[
    'rate_sheets','rate_groups','rate_burden_lines','rate_crafts','rate_equipment'
  ] loop
    execute format('drop policy if exists "%1$s: owner all" on public.%1$s', t);
    execute format(
      'create policy "%1$s: owner all" on public.%1$s for all
         using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t);
  end loop;
end
$rls$;
