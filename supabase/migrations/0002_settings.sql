-- =============================================================================
-- Tradevoice — settings columns on profiles
-- =============================================================================
-- Adds JSONB columns for the contractor's payment-method handles (Stripe, Venmo, Zelle, etc.)
-- and per-state tax-rate overrides. Both are flexible blobs that mirror the front-end's existing shape.

alter table public.profiles
  add column if not exists payments  jsonb default '{}'::jsonb,
  add column if not exists tax_rates jsonb default '{}'::jsonb;
