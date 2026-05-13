-- =============================================================================
-- Tradevoice — lock down SECURITY DEFINER function EXECUTE grants
-- =============================================================================
-- Postgres grants EXECUTE to PUBLIC by default when you create a function.
-- For SECURITY DEFINER functions, that means anyone with the anon API key
-- can invoke them with elevated (function-owner / superuser) privileges.
--
-- Earlier migrations granted to service_role / anon / authenticated, but
-- never REVOKED from PUBLIC, so the default-grant kept the wider audience.
-- This migration tightens each function to exactly the role(s) that
-- legitimately call it.
--
-- Three buckets:
--   1. service_role only — webhook handlers / serverless endpoint RPCs.
--      No anon/authenticated business calling these directly.
--   2. anon + authenticated — token-gated public endpoints (invoice/quote
--      share pages, unsubscribe). The token in the argument IS the auth.
--   3. authenticated only — called from RLS policies / app code.
--
-- The DO block is defensive: each statement runs inside its own exception
-- frame so a missing function in an unusual environment doesn't abort the
-- whole migration. RAISE NOTICE leaves a trail in the SQL Editor output.
-- =============================================================================

do $sec22$
declare
  fn_sig text;
  service_only text[] := array[
    'public.mark_invoice_paid_via_stripe(uuid, numeric, text, text)',
    'public.update_subscription_status(text, text, text, timestamptz)',
    'public.link_plan_subscription_from_checkout(text, text, text, text, timestamptz)',
    'public.update_plan_subscription_status(text, text, timestamptz, timestamptz)',
    'public.log_marketing_send(uuid, uuid, uuid, text, text, text, text, text, text, text)'
  ];
  anon_callable text[] := array[
    'public.get_public_invoice(uuid)',
    'public.get_public_invoice_for_payment(uuid)',
    'public.get_public_quote(uuid)',
    'public.accept_public_quote(uuid)',
    'public.mark_public_quote_viewed(uuid)',
    'public.unsubscribe_client_by_token(uuid)'
  ];
  auth_only text[] := array[
    'public.tradevoice_my_owner_id()'
  ];
begin
  -- 1. Service-role only
  foreach fn_sig in array service_only loop
    begin
      execute format('revoke execute on function %s from public',     fn_sig);
      execute format('revoke execute on function %s from anon',       fn_sig);
      execute format('revoke execute on function %s from authenticated', fn_sig);
      execute format('grant  execute on function %s to service_role', fn_sig);
    exception when undefined_function then
      raise notice 'Skipping service-only fn % (not found in this env)', fn_sig;
    end;
  end loop;

  -- 2. Token-gated public functions (anon + authenticated). Revoke from
  -- PUBLIC so the warning clears, then explicitly grant to anon +
  -- authenticated — same effective access, but no implicit PUBLIC grant.
  foreach fn_sig in array anon_callable loop
    begin
      execute format('revoke execute on function %s from public',     fn_sig);
      execute format('grant  execute on function %s to anon, authenticated', fn_sig);
    exception when undefined_function then
      raise notice 'Skipping anon-callable fn % (not found in this env)', fn_sig;
    end;
  end loop;

  -- 3. RLS-helper functions — needed by authenticated app sessions only.
  foreach fn_sig in array auth_only loop
    begin
      execute format('revoke execute on function %s from public',        fn_sig);
      execute format('revoke execute on function %s from anon',          fn_sig);
      execute format('grant  execute on function %s to authenticated',   fn_sig);
    exception when undefined_function then
      raise notice 'Skipping auth-only fn % (not found in this env)', fn_sig;
    end;
  end loop;

  -- 4. handle_new_user() — trigger function, fired by Postgres on auth
  -- signup. Triggers run regardless of EXECUTE grants on the function,
  -- so revoking PUBLIC here is safe and clears the warning.
  begin
    execute 'revoke execute on function public.handle_new_user() from public';
    execute 'revoke execute on function public.handle_new_user() from anon';
    execute 'revoke execute on function public.handle_new_user() from authenticated';
  exception when undefined_function then
    raise notice 'Skipping handle_new_user (not found in this env)';
  end;
end $sec22$;
