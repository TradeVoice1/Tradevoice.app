-- =============================================================================
-- Tradevoice — per-invoice and per-quote state (multi-state contractor fix)
-- =============================================================================
-- Until now, calcInvoice received ONLY the contractor's primary state, so
-- every invoice silently used the contractor's home-state tax rates. For
-- multi-state contractors (a TX plumber who also does work in Louisiana)
-- this is a real compliance issue — a Louisiana job was getting taxed at
-- Texas rates regardless of where the work actually happened.
--
-- This migration adds a per-invoice and per-quote `state` column. The
-- column is nullable — older rows that pre-date this change have NULL
-- and the front-end falls back to user.states[0] for backward compat.
-- New invoices created via the editor (after the corresponding front-end
-- changes land) always stamp the state so it's preserved even if the
-- contractor later removes/adds states from their profile.
--
-- No index on the column — we never filter by it. Tax math reads it
-- per-invoice during render, that's the only consumer.
-- =============================================================================

alter table public.invoices
  add column if not exists state text;

alter table public.quotes
  add column if not exists state text;

notify pgrst, 'reload schema';
