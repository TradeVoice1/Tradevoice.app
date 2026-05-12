-- =============================================================================
-- Tradevoice — Google review link on profile + per-client unsubscribe
-- =============================================================================
-- Two related additions:
--
--   1. profiles.review_link
--      The contractor's Google Business Profile review URL. Used by the
--      Marketing → Review Request flow to append a direct "leave a
--      review" link to the email body. Optional — when blank the email
--      goes without a link.
--
--   2. clients.unsubscribed_at + clients.unsubscribe_token
--      One-click opt-out. Each client row gets a stable uuid token at
--      insert time; the marketing email footer + List-Unsubscribe header
--      link to /api/marketing/unsubscribe?t=<token>. When the recipient
--      clicks, we set unsubscribed_at = now() and future sends skip them.
--
-- Public unsubscribe lookup is a security-definer RPC (anon-callable) so
-- the recipient doesn't need to be signed in to opt out — the token IS
-- the auth.
-- =============================================================================

-- ── profile: Google review link ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists review_link text;

-- ── clients: unsubscribe tracking ───────────────────────────────────────────
alter table public.clients
  add column if not exists unsubscribed_at   timestamptz,
  add column if not exists unsubscribe_token uuid default uuid_generate_v4();

-- Backfill tokens for any pre-existing rows (the column default only
-- applies to new inserts).
update public.clients
   set unsubscribe_token = uuid_generate_v4()
 where unsubscribe_token is null;

-- Make tokens NOT NULL once backfilled so the marketing endpoints can
-- rely on them. Use IF NOT EXISTS via DO block since "alter column set
-- not null" doesn't accept IF NOT EXISTS directly.
do $sub20$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='clients'
       and column_name='unsubscribe_token' and is_nullable='YES'
  ) then
    alter table public.clients alter column unsubscribe_token set not null;
  end if;
end $sub20$;

create unique index if not exists clients_unsubscribe_token_idx
  on public.clients (unsubscribe_token);

-- ── RPC: unsubscribe a client by token (anon-callable) ──────────────────────
-- Returns the contractor company name so the confirmation page can say
-- "You've been unsubscribed from {Company}'s emails". Returns null if the
-- token doesn't match a client (we still render a generic "unsubscribed"
-- page in that case — leaks no information).
create or replace function public.unsubscribe_client_by_token(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $sub21$
declare
  c record;
  prof record;
begin
  if p_token is null then return null; end if;

  -- Find the client + flip the timestamp atomically.
  update public.clients
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = p_token
   returning id, owner_id, name, email, unsubscribed_at
   into c;

  if c.id is null then return null; end if;

  select coalesce(company, name, 'us') as display_name
    into prof
    from public.profiles
   where id = c.owner_id;

  return json_build_object(
    'ok',             true,
    'client_id',      c.id,
    'recipient',      coalesce(c.name, c.email, ''),
    'company',        prof.display_name,
    'unsubscribed_at', c.unsubscribed_at
  );
end;
$sub21$;

grant execute on function public.unsubscribe_client_by_token(uuid) to anon, authenticated;
