-- =============================================================================
-- Tradevoice — sequential job numbers + denormalized job_number on invoices
-- =============================================================================
-- Before this migration: jobs had only a UUID primary key — nothing
-- human-readable for a contractor to reference (e.g. "fix the leak from
-- JOB-2026-0042"). Invoices had no link back to a job number either,
-- so when a customer called about an old invoice the contractor had to
-- pivot through client name + date to find the original job.
--
-- This migration:
--   1. Adds jobs.number (text) with the same race-safe per-owner-per-year
--      numbering trigger pattern that invoices + quotes use (migration
--      0012). Format: JOB-2026-0042.
--   2. Backfills numbers for all existing jobs in creation order so the
--      column can be made NOT NULL without breaking the table.
--   3. Adds invoices.job_number (text) — denormalized snapshot of the
--      originating job's number when a job converts to an invoice (via
--      handleJobToInvoice in App.jsx). Manual invoices not from a job
--      leave it null.
-- =============================================================================

-- ── jobs.number column ──────────────────────────────────────────────────────
alter table public.jobs
  add column if not exists number text;

-- Backfill: assign sequential numbers to any pre-existing jobs so they
-- conform to the new format. Ordered by created_at within each owner/year
-- so older jobs get lower numbers. Idempotent — only fills NULLs.
with ordered as (
  select
    id,
    'JOB-' || extract(year from coalesce(created_at, now()))::int || '-' ||
      lpad(row_number() over (
        partition by owner_id, extract(year from coalesce(created_at, now()))::int
        order by created_at, id
      )::text, 4, '0') as next_number
  from public.jobs
  where number is null
)
update public.jobs j
   set number = o.next_number
  from ordered o
 where j.id = o.id
   and j.number is null;

-- Now safe to require non-null on new rows. (The trigger below will fill
-- this in BEFORE the NOT NULL check fires.)
alter table public.jobs
  alter column number set not null;

-- Unique per owner so two of an owner's jobs can't share a number, but
-- different owners can each have their own JOB-2026-0001.
create unique index if not exists jobs_owner_number_idx
  on public.jobs (owner_id, number);

-- ── Trigger: assign next sequential job number on insert ────────────────────
-- Mirrors public.assign_invoice_number from migration 0012. Per-owner
-- advisory lock on a distinct prefix ('jobnum:') so it doesn't share a
-- lock slot with invoices or quotes.
create or replace function public.assign_job_number()
returns trigger language plpgsql as $$
declare
  yr int;
  prefix text;
  next_seq int;
begin
  if new.number is not null and new.number <> '' then
    return new;
  end if;
  yr := extract(year from coalesce(new.created_at, now()))::int;
  prefix := 'JOB-' || yr || '-';
  perform pg_advisory_xact_lock(hashtext('jobnum:' || new.owner_id::text));
  select coalesce(max((substring(number from '\d+$'))::int), 0) + 1
    into next_seq
    from public.jobs
    where owner_id = new.owner_id
      and number like prefix || '%';
  new.number := prefix || lpad(next_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists assign_job_number_trigger on public.jobs;
create trigger assign_job_number_trigger
  before insert on public.jobs
  for each row execute function public.assign_job_number();

-- ── invoices.job_number — denormalized snapshot ─────────────────────────────
-- Stamped by the front-end's handleJobToInvoice when it converts a job
-- into a draft invoice (see App.jsx). Lets the invoice document show
-- "Job #JOB-2026-0042" without joining to jobs at render time, and
-- preserves the link even if the originating job is later deleted.
alter table public.invoices
  add column if not exists job_number text;

-- No index needed — only read alongside the rest of the invoice row.

notify pgrst, 'reload schema';
