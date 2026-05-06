-- =============================================================================
-- Tradevoice — race-safe per-owner sequential numbering for invoices + quotes
-- =============================================================================
-- Replaces the old client-side counter approach. The front-end now sends
-- number=null on insert; these BEFORE INSERT triggers compute the next
-- sequential number per owner, per year, under an advisory lock so two
-- concurrent inserts from the same owner can never collide.
--
-- Key properties:
--   - Per-owner sequence: owner A's INV-2026-0001 doesn't conflict with
--     owner B's INV-2026-0001. unique(owner_id, number) already enforces this.
--   - Per-year reset: each year starts back at 0001.
--   - Advisory transaction lock keyed on owner_id: only one insert per owner
--     can be computing the next number at a time. Lock auto-releases on
--     transaction commit/rollback.
--   - If the caller already supplied a number (e.g. a manual override or a
--     restored row), the trigger leaves it alone.
--   - max() + 1 is safe under the advisory lock, since no other concurrent
--     transaction holding the same owner key can be inserting at the same time.
--
-- Notes:
--   - BEFORE INSERT triggers fire before NOT NULL checks, so the existing
--     `number text not null` constraint is satisfied as long as the trigger
--     fills it in.
--   - hashtext() returns int4, which fits pg_advisory_xact_lock(bigint)
--     after implicit cast. Distinct prefixes ('invnum:'/'qtnum:') keep
--     invoice and quote sequences from sharing a lock slot.
-- =============================================================================

create or replace function public.assign_invoice_number()
returns trigger language plpgsql as $$
declare
  yr int;
  prefix text;
  next_seq int;
begin
  -- If caller already set a number, leave it alone.
  if new.number is not null and new.number <> '' then
    return new;
  end if;

  yr := extract(year from coalesce(new.created_at, now()))::int;
  prefix := 'INV-' || yr || '-';

  -- Per-owner advisory lock — auto-released at commit/rollback.
  perform pg_advisory_xact_lock(hashtext('invnum:' || new.owner_id::text));

  select coalesce(max((substring(number from '\d+$'))::int), 0) + 1
    into next_seq
    from public.invoices
    where owner_id = new.owner_id
      and number like prefix || '%';

  new.number := prefix || lpad(next_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists assign_invoice_number_trigger on public.invoices;
create trigger assign_invoice_number_trigger
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();


create or replace function public.assign_quote_number()
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
  prefix := 'QT-' || yr || '-';

  perform pg_advisory_xact_lock(hashtext('qtnum:' || new.owner_id::text));

  select coalesce(max((substring(number from '\d+$'))::int), 0) + 1
    into next_seq
    from public.quotes
    where owner_id = new.owner_id
      and number like prefix || '%';

  new.number := prefix || lpad(next_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists assign_quote_number_trigger on public.quotes;
create trigger assign_quote_number_trigger
  before insert on public.quotes
  for each row execute function public.assign_quote_number();
