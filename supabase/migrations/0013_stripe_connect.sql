-- =============================================================================
-- Tradevoice — Stripe Connect (Standard accounts)
-- =============================================================================
-- The contractor connects their own Stripe account via OAuth. Money flows
-- directly to their bank when a customer pays an invoice, and Tradevoice
-- skims a 1% platform fee on top of Stripe's 2.9% + $0.30. Customer pays
-- the inflated total; contractor still keeps 100% of their invoice amount.
--
-- Identifiers we persist:
--   profiles.stripe_account_id          — `acct_...`, the connected account
--                                          we route charges to. Null until
--                                          the contractor finishes OAuth.
--   profiles.stripe_account_charges_enabled — true once Stripe has verified
--                                          the account can accept charges.
--                                          Updated by the account.updated
--                                          webhook so the UI can hide the
--                                          Pay button if Stripe later
--                                          disables the connected account.
--
--   The invoice's per-payment data already lives in invoices.payments (jsonb)
--   so we don't need a new column for the PaymentIntent — each payment row
--   gets a stripe_payment_intent_id and stripe_charge_id alongside the
--   existing date/amount/method fields.
-- =============================================================================

alter table public.profiles
  add column if not exists stripe_account_id              text,
  add column if not exists stripe_account_charges_enabled boolean default false;

create index if not exists profiles_stripe_account_idx
  on public.profiles (stripe_account_id);

-- Public invoice payment lookup — the customer-facing page is anonymous,
-- so the API endpoint creating a PaymentIntent has to find the invoice + the
-- contractor's stripe_account_id from the share_token alone. Reuses the
-- security-definer pattern from migration 0011's get_public_invoice.
create or replace function public.get_public_invoice_for_payment(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select id, owner_id, number, status, payments, labor, materials, equipment,
         markup, tax, client_name, client_email, title
    into inv
    from public.invoices
    where share_token = p_token
    limit 1;
  if not found then return null; end if;

  select stripe_account_id, stripe_account_charges_enabled, company, name
    into prof
    from public.profiles
    where id = inv.owner_id;

  return json_build_object(
    'invoice_id',                 inv.id,
    'owner_id',                   inv.owner_id,
    'number',                     inv.number,
    'status',                     inv.status,
    'payments',                   inv.payments,
    'labor',                      inv.labor,
    'materials',                  inv.materials,
    'equipment',                  inv.equipment,
    'markup',                     inv.markup,
    'tax',                        inv.tax,
    'client_name',                inv.client_name,
    'client_email',               inv.client_email,
    'title',                      inv.title,
    'stripe_account_id',          prof.stripe_account_id,
    'stripe_charges_enabled',     coalesce(prof.stripe_account_charges_enabled, false),
    'contractor_company',         coalesce(prof.company, prof.name)
  );
end;
$$;

grant execute on function public.get_public_invoice_for_payment(uuid) to anon, authenticated;

-- Webhook-driven: when payment_intent.succeeded fires for an invoice,
-- the webhook handler calls this RPC to atomically mark the invoice paid
-- and append an activity entry. Security definer because the webhook
-- calls it with the service role; we trust the call site.
create or replace function public.mark_invoice_paid_via_stripe(
  p_invoice_id      uuid,
  p_amount          numeric,
  p_payment_intent  text,
  p_charge_id       text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  new_payments jsonb;
  new_activity jsonb;
  payment_entry jsonb;
  activity_entry jsonb;
begin
  select * into inv from public.invoices where id = p_invoice_id;
  if not found then
    return json_build_object('ok', false, 'error', 'invoice_not_found');
  end if;

  -- Idempotency: skip if we've already recorded this PaymentIntent.
  if exists (
    select 1 from jsonb_array_elements(coalesce(inv.payments, '[]'::jsonb)) p
    where p->>'stripe_payment_intent_id' = p_payment_intent
  ) then
    return json_build_object('ok', true, 'duplicate', true);
  end if;

  payment_entry := jsonb_build_object(
    'date',                       to_char(now(), 'YYYY-MM-DD'),
    'amount',                     p_amount,
    'method',                     'card',
    'note',                       'Paid online via Stripe',
    'stripe_payment_intent_id',   p_payment_intent,
    'stripe_charge_id',           p_charge_id
  );
  new_payments := coalesce(inv.payments, '[]'::jsonb) || jsonb_build_array(payment_entry);

  activity_entry := jsonb_build_object(
    'date', to_char(now(), 'YYYY-MM-DD'),
    'type', 'payment',
    'note', 'Stripe payment of $' || to_char(p_amount, 'FM999,999,990.00') || ' received'
  );
  new_activity := coalesce(inv.activity, '[]'::jsonb) || jsonb_build_array(activity_entry);

  update public.invoices
     set payments = new_payments,
         activity = new_activity,
         status   = 'paid',
         paid_at  = current_date
   where id = p_invoice_id;

  return json_build_object('ok', true, 'duplicate', false);
end;
$$;

grant execute on function public.mark_invoice_paid_via_stripe(uuid, numeric, text, text) to service_role;


-- =============================================================================
-- Update get_public_invoice (from migration 0011) to also surface whether
-- the contractor's Stripe Connect account is ready to accept card payments.
-- The customer-facing page uses this flag to decide whether to render the
-- "Pay with Card" button vs the existing handle-based payment instructions.
-- =============================================================================
create or replace function public.get_public_invoice(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into inv from public.invoices where share_token = p_token limit 1;
  if not found then return null; end if;

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
$$;

