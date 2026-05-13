-- =============================================================================
-- Tradevoice — invoice tracking fields + per-client customer number
-- =============================================================================
-- Ship 1 of the invoice expansion (research summary in chat 2026-05-12):
--
-- Invoice-level additions:
--   po_number              — customer's purchase order number (commercial AP requires it)
--   work_order_number      — contractor's internal job # (one job → many invoices for change orders)
--   job_address            — site address, separate from billing client_address
--   requested_by           — contact at site who asked for the work
--   approved_by            — signatory who authorized the work
--   salesperson_user_id    — team member who SOLD the job (≠ tech_user_id who performed)
--   salesperson_name       — snapshot, mirrors tech_name pattern
--   sent_at                — when the invoice was first marked 'sent'
--   viewed_at              — when the public /i/<token> page was first loaded
--   service_period_start   — for recurring/maintenance plan billing (Aug 1)
--   service_period_end     — and matching close date (Aug 31)
--
-- Client-level addition:
--   customer_number        — human-readable per-owner sequential ID (CUST-0001).
--                            Owners reference clients by this in conversation,
--                            on POs, in QuickBooks exports, etc. Auto-assigned
--                            by trigger on insert; mirrors the invoice number
--                            machinery from migration 0012.
--
-- All new fields are nullable so existing rows + the seeder keep working.
-- =============================================================================

-- ── Invoice columns ─────────────────────────────────────────────────────────
alter table public.invoices
  add column if not exists po_number            text,
  add column if not exists work_order_number    text,
  add column if not exists job_address          text,
  add column if not exists requested_by         text,
  add column if not exists approved_by          text,
  add column if not exists salesperson_user_id  uuid,
  add column if not exists salesperson_name     text,
  add column if not exists sent_at              timestamptz,
  add column if not exists viewed_at            timestamptz,
  add column if not exists service_period_start date,
  add column if not exists service_period_end   date;

-- Indexed lookups we'll actually use
create index if not exists invoices_po_idx          on public.invoices (owner_id, po_number);
create index if not exists invoices_work_order_idx  on public.invoices (owner_id, work_order_number);

-- ── Client customer_number ──────────────────────────────────────────────────
alter table public.clients
  add column if not exists customer_number text;

create unique index if not exists clients_owner_customer_number_idx
  on public.clients (owner_id, customer_number)
  where customer_number is not null;

-- ── Trigger: auto-assign customer_number on insert ──────────────────────────
-- Mirrors migration 0012's invoice/quote number pattern: per-owner advisory
-- lock, max+1, zero-padded 4-digit format. Leaves the column alone if the
-- caller already supplied a value (migration import / data restore).
create or replace function public.assign_customer_number()
returns trigger
language plpgsql
set search_path = public
as $cn1$
declare
  next_seq int;
begin
  if new.customer_number is not null and new.customer_number <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('custnum:' || new.owner_id::text));

  select coalesce(max((substring(customer_number from '\d+$'))::int), 0) + 1
    into next_seq
    from public.clients
    where owner_id = new.owner_id
      and customer_number like 'CUST-%';

  new.customer_number := 'CUST-' || lpad(next_seq::text, 4, '0');
  return new;
end;
$cn1$;

drop trigger if exists assign_customer_number_trigger on public.clients;
create trigger assign_customer_number_trigger
  before insert on public.clients
  for each row execute function public.assign_customer_number();

-- ── Backfill existing clients (oldest first → lowest numbers) ───────────────
do $cn2$
declare
  owner record;
  c record;
  seq int;
begin
  for owner in select distinct owner_id from public.clients where customer_number is null loop
    seq := coalesce(
      (select max((substring(customer_number from '\d+$'))::int)
         from public.clients
        where owner_id = owner.owner_id
          and customer_number like 'CUST-%'),
      0
    );
    for c in
      select id from public.clients
       where owner_id = owner.owner_id and customer_number is null
       order by created_at asc, id asc
    loop
      seq := seq + 1;
      update public.clients
         set customer_number = 'CUST-' || lpad(seq::text, 4, '0')
       where id = c.id;
    end loop;
  end loop;
end $cn2$;

-- ── Update get_public_invoice to set viewed_at on first view ────────────────
-- Migration 0013 already redefined get_public_invoice (security definer).
-- Add a side-effect: on first view of a 'sent' invoice, flip status to
-- 'viewed' AND stamp viewed_at = now(). Idempotent — coalesce keeps the
-- earliest view timestamp if the page is reloaded.
create or replace function public.get_public_invoice(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $vi1$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into inv from public.invoices where share_token = p_token limit 1;
  if not found then return null; end if;

  -- First-view bookkeeping. Only flip 'sent' → 'viewed' (don't touch draft —
  -- contractor hasn't shared yet — or paid/void — terminal states).
  if inv.status = 'sent' then
    update public.invoices
       set status     = 'viewed',
           viewed_at  = coalesce(viewed_at, now())
     where id = inv.id;
    -- Refresh local copy so the returned row reflects the update.
    inv.status    := 'viewed';
    inv.viewed_at := coalesce(inv.viewed_at, now());
  elsif inv.viewed_at is null then
    -- Edge case: already 'viewed' but viewed_at was never recorded
    -- (migration-era invoices). Stamp it now for the activity feed.
    update public.invoices
       set viewed_at = now()
     where id = inv.id and viewed_at is null;
    inv.viewed_at := now();
  end if;

  select
    name, company, phone, tagline, license,
    payments, accent_color, logo_url,
    stripe_account_id, stripe_account_charges_enabled
  into prof
  from public.profiles where id = inv.owner_id;

  return json_build_object(
    'invoice', row_to_json(inv),
    'profile', case when prof is null then null else row_to_json(prof) end
  );
end;
$vi1$;

-- Re-assert the grant pattern from migration 0022.
revoke execute on function public.get_public_invoice(uuid) from public;
grant  execute on function public.get_public_invoice(uuid) to anon, authenticated;
