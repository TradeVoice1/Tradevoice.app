-- =============================================================================
-- Tradevoice — per-owner rate library
-- =============================================================================
-- Today the quote/invoice editor's "Library" is local React state — adding
-- a custom material/equipment/labor item via QuickAddPanel disappears the
-- moment the editor closes. This migration adds the persistent storage
-- layer that:
--
--   1. Makes "Save to Library" actually save (the existing button finally
--      means what it says).
--   2. Backs the new "Upload rate sheet PDF" flow (Settings → Rate
--      Library). Claude vision parses the PDF and bulk-inserts here.
--
-- Schema notes:
--   - kind is the discriminator: 'labor' | 'material' | 'equipment'.
--   - For labor: rate = hourly rate; cost/qty/unit are typically null.
--   - For materials: cost = unit cost, unit = "ea" / "ft" / "box" / etc.,
--     qty is the default quantity to pre-fill on the line item.
--   - For equipment: rate = per-unit rate, unit = "day" / "hr" / etc.
--   - trade is optional; null means "applies to any trade I work in".
--     When set it scopes the item to e.g. only HVAC quotes.
--   - source: 'manual' (typed in), 'pdf_import' (Claude parsed),
--     'starter' (auto-seeded from TRADE_CONFIG defaults later).
-- =============================================================================

create table if not exists public.rate_library_items (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  -- 'labor' | 'material' | 'equipment'
  kind         text not null check (kind in ('labor','material','equipment')),
  -- Trade key from TRADE_CONFIG (Plumber, HVAC, etc.) or null = any trade
  trade        text,
  description  text not null,
  unit         text,
  qty          numeric(12,2),
  cost         numeric(12,2),
  rate         numeric(12,2),
  -- Telemetry on where this row came from. Lets us show "imported from
  -- 2026-03-14 rate sheet" on a row, dedupe re-imports later.
  source       text default 'manual',
  source_ref   text,        -- e.g. file name of the PDF this came from
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists rate_library_owner_idx
  on public.rate_library_items (owner_id, kind, trade);
create index if not exists rate_library_owner_created_idx
  on public.rate_library_items (owner_id, created_at desc);

alter table public.rate_library_items enable row level security;

drop policy if exists "rate_library: owner all" on public.rate_library_items;
create policy "rate_library: owner all"
  on public.rate_library_items for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.rate_library_items;
create trigger set_updated_at before update on public.rate_library_items
  for each row execute function public.set_updated_at();

-- ── RPC: bulk insert from Claude PDF parse ──────────────────────────────────
-- Called by /api/library/parse-rate-table after the user confirms what
-- Claude extracted. Service-role only — the front-end goes through the API
-- endpoint, which has already authenticated the user and validated the
-- payload shape. Returns the inserted row IDs so the UI can show a
-- success count + offer "undo this import" later.
create or replace function public.bulk_insert_rate_library(
  p_owner_id uuid,
  p_items    jsonb,
  p_source   text default 'pdf_import',
  p_source_ref text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $rl1$
declare
  inserted_count int := 0;
  item jsonb;
begin
  if p_owner_id is null then
    return json_build_object('ok', false, 'error', 'missing_owner_id');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return json_build_object('ok', false, 'error', 'items_must_be_array');
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    -- Skip items with no description (parser noise / blank rows).
    if coalesce(btrim(item->>'description'), '') = '' then
      continue;
    end if;
    -- Skip items with no recognized kind.
    if (item->>'kind') not in ('labor', 'material', 'equipment') then
      continue;
    end if;

    insert into public.rate_library_items (
      owner_id, kind, trade, description, unit, qty, cost, rate,
      source, source_ref
    ) values (
      p_owner_id,
      item->>'kind',
      nullif(item->>'trade', ''),
      btrim(item->>'description'),
      nullif(item->>'unit', ''),
      nullif(item->>'qty',  '')::numeric,
      nullif(item->>'cost', '')::numeric,
      nullif(item->>'rate', '')::numeric,
      coalesce(p_source, 'pdf_import'),
      p_source_ref
    );
    inserted_count := inserted_count + 1;
  end loop;

  return json_build_object('ok', true, 'inserted', inserted_count);
end;
$rl1$;

revoke execute on function public.bulk_insert_rate_library(uuid, jsonb, text, text) from public;
revoke execute on function public.bulk_insert_rate_library(uuid, jsonb, text, text) from anon;
revoke execute on function public.bulk_insert_rate_library(uuid, jsonb, text, text) from authenticated;
grant  execute on function public.bulk_insert_rate_library(uuid, jsonb, text, text) to service_role;
