-- =============================================================================
-- Tradevoice — invoice maturity additions (Ship 2)
-- =============================================================================
-- Round 2 of the invoice expansion. Adds the fields a commercial contractor
-- needs to graduate from "homemade Word template" to professional billing:
--
--   1. Permit number (per-invoice). Many trade jobs require a pulled permit
--      and customers want the # printed on the invoice for their records.
--
--   2. Discount (per-invoice). A first-class amount + label pair so the
--      contractor doesn't have to use "negative markup" as a hack. Applied
--      to subtotal before tax — standard contractor convention.
--
--   3. Late fee terms (per-invoice override + per-profile default). Sets
--      enforceable late-fee language on every invoice automatically; the
--      contractor can override per job if they're cutting a customer slack.
--
--   4. Certificate of Insurance (per-profile). Commercial AP departments
--      won't process payment without the contractor's GL carrier + policy
--      info on the invoice.
--
--   5. Customer e-signature + tech sign-off (per-invoice). Two name +
--      timestamp pairs. "Type your name to acknowledge" model — the drawn-
--      signature canvas is deferred to a future session because it needs
--      more UI surface area than it's worth tonight. Customers sign on the
--      public /i/<token> page via a new anon-callable RPC.
-- =============================================================================

-- ── Invoices: per-invoice fields ────────────────────────────────────────────
alter table public.invoices
  add column if not exists permit_number           text,
  add column if not exists discount_amount         numeric(12,2) default 0,
  add column if not exists discount_label          text,
  add column if not exists late_fee_terms          text,
  -- Tech sign-off: contractor's tech checks the box / types their name in
  -- the editor before sending. Distinct from the invoice author or who
  -- "performed" the work (those are tech_name fields).
  add column if not exists tech_signed_name        text,
  add column if not exists tech_signed_at          timestamptz,
  -- Customer e-sign: captured on the public invoice page. signed_name is
  -- what they typed; signed_ip is what we saw (defensible if a dispute).
  add column if not exists customer_signed_name    text,
  add column if not exists customer_signed_at      timestamptz,
  add column if not exists customer_signed_ip      inet;

-- ── Profiles: business-level static info ────────────────────────────────────
alter table public.profiles
  add column if not exists coi_carrier              text,
  add column if not exists coi_policy_number        text,
  add column if not exists coi_expires_at           date,
  add column if not exists default_late_fee_policy  text;

-- ── RPC: record a customer e-signature by share token (anon-callable) ──────
-- Public page submits the token + the typed name. We:
--   1. Look up the invoice by share_token (only sent/viewed/partial are
--      signable — draft is not shared yet, paid/void are terminal).
--   2. Stamp customer_signed_name, customer_signed_at, customer_signed_ip.
--   3. Append a 'signed' activity entry for the audit log.
-- Idempotent — re-signing replaces the previous capture (latest signature
-- of the same person wins; in practice customers sign once).
create or replace function public.sign_public_invoice(
  p_token  uuid,
  p_name   text,
  p_ip     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $sig1$
declare
  inv record;
  new_activity jsonb;
  ip_value inet;
begin
  if p_token is null then
    return json_build_object('ok', false, 'error', 'missing_token');
  end if;
  if p_name is null or btrim(p_name) = '' then
    return json_build_object('ok', false, 'error', 'missing_name');
  end if;

  select id, status, activity into inv
    from public.invoices
   where share_token = p_token
   limit 1;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if inv.status not in ('sent', 'viewed', 'partial', 'overdue') then
    return json_build_object('ok', false, 'error', 'not_signable', 'status', inv.status);
  end if;

  -- Defensive inet cast — a malformed forwarded IP shouldn't sink the sign.
  begin
    ip_value := nullif(p_ip, '')::inet;
  exception when others then
    ip_value := null;
  end;

  new_activity := coalesce(inv.activity, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD'),
      'type', 'signed',
      'note', 'Customer signed: ' || btrim(p_name)
    )
  );

  update public.invoices
     set customer_signed_name = btrim(p_name),
         customer_signed_at   = now(),
         customer_signed_ip   = ip_value,
         activity             = new_activity
   where id = inv.id;

  return json_build_object(
    'ok',        true,
    'signed_at', now(),
    'name',      btrim(p_name)
  );
end;
$sig1$;

-- Locked-down grants per migration 0022 pattern.
revoke execute on function public.sign_public_invoice(uuid, text, text) from public;
grant  execute on function public.sign_public_invoice(uuid, text, text) to anon, authenticated;

-- ── Update get_public_invoice (from 0011/0013/0023) ─────────────────────────
-- Add COI fields to the profile payload so the public invoice page can
-- render the insurance + late-fee footer that the in-app InvoiceDocument
-- shows. Keep all the prior behavior (viewed_at stamping, status flip).
create or replace function public.get_public_invoice(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $vi2$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into inv from public.invoices where share_token = p_token limit 1;
  if not found then return null; end if;

  if inv.status = 'sent' then
    update public.invoices
       set status     = 'viewed',
           viewed_at  = coalesce(viewed_at, now())
     where id = inv.id;
    inv.status    := 'viewed';
    inv.viewed_at := coalesce(inv.viewed_at, now());
  elsif inv.viewed_at is null then
    update public.invoices
       set viewed_at = now()
     where id = inv.id and viewed_at is null;
    inv.viewed_at := now();
  end if;

  select
    name, company, phone, tagline, license,
    payments, accent_color, logo_url,
    stripe_account_id, stripe_account_charges_enabled,
    coi_carrier, coi_policy_number, coi_expires_at,
    default_late_fee_policy
  into prof
  from public.profiles where id = inv.owner_id;

  return json_build_object(
    'invoice', row_to_json(inv),
    'profile', case when prof is null then null else row_to_json(prof) end
  );
end;
$vi2$;

revoke execute on function public.get_public_invoice(uuid) from public;
grant  execute on function public.get_public_invoice(uuid) to anon, authenticated;
