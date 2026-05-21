-- =============================================================================
-- Tradevoice — per-state contractor licenses
-- =============================================================================
-- Multi-state contractors hold different license numbers in each state
-- they operate in. A Texas plumber doing a Louisiana job needs to show
-- the LA license on that invoice — showing the TX license would be
-- compliance-incorrect and potentially fraudulent in some states.
--
-- Until this migration: profiles.license was a single text field shared
-- across every invoice/quote the contractor produced. For single-state
-- contractors that's fine. For multi-state contractors it was a
-- correctness bug.
--
-- New shape:
--   • profiles.state_licenses (jsonb) — map of { state_name → license_number }.
--     One row per state the contractor is licensed in. Keys mirror the
--     entries in profiles.states (free text matching is fine here since
--     we control the UI and validate against the canonical STATES list).
--   • invoices.license_number / quotes.license_number (text) — stamped
--     at document-save time based on the document's state field
--     (migration 0033). Preserves the license that applied AT THE TIME
--     OF ISSUE even if the contractor later changes/removes the
--     license from their profile. Same denormalized-snapshot pattern
--     we use for clientName / techName on invoices.
--
-- Fallback behavior: if invoice.license_number is null (legacy rows from
-- before this migration, or contractors who haven't set a per-state
-- license yet), render code falls back to profile.state_licenses[state]
-- → profile.license → empty. Three layers of graceful degradation so
-- existing invoices keep displaying whatever they used to display.
-- =============================================================================

alter table public.profiles
  add column if not exists state_licenses jsonb not null default '{}'::jsonb;

alter table public.invoices
  add column if not exists license_number text;

alter table public.quotes
  add column if not exists license_number text;

-- No indexes — license_number is render-time data only, never filtered on.
-- state_licenses is read alongside the rest of the profile, doesn't need
-- its own index.

notify pgrst, 'reload schema';
