-- =============================================================================
-- Tradevoice — audit fixes (jobs.client_name + invoices.source_quote_id)
-- =============================================================================
-- Two related schema gaps surfaced in the May 2026 code audit:
--
-- 1. Jobs were storing the client's typed name in front-end state under a
--    `client` key that had no DB column. Saves succeeded but the name was
--    silently dropped, so calendar tooltips and Job→Invoice flow showed
--    blank client names after any reload. Add `client_name` and let the
--    data layer round-trip it. (We keep `client_id` as the FK — `client_name`
--    is the denormalized snapshot, mirroring the pattern on invoices.)
--
-- 2. Un-invoice was parsing "Converted from <quote.number>" out of free-text
--    invoice notes to find the source quote. If the user edited the note,
--    the parse failed silently. Add a real FK column so the link is
--    durable.
-- =============================================================================

alter table public.jobs
  add column if not exists client_name text;

alter table public.invoices
  add column if not exists source_quote_id uuid references public.quotes(id) on delete set null;

create index if not exists invoices_source_quote_idx on public.invoices (source_quote_id);
