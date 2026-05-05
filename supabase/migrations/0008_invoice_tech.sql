-- =============================================================================
-- Tradevoice — invoice tech attribution
-- =============================================================================
-- Track which technician actually performed the work on an invoice. Lets the
-- contractor (and the customer) see "Service performed by Carlos M." right
-- on the doc, and lets the contractor pull per-tech revenue reports later.
--
-- tech_user_id is a soft FK to auth.users — gets nulled if the tech leaves.
-- tech_name is a denormalized snapshot at create time so the doc still
-- displays correctly even after the tech's profile row is deleted.
-- =============================================================================

alter table public.invoices
  add column if not exists tech_user_id uuid references auth.users(id) on delete set null,
  add column if not exists tech_name    text;

create index if not exists invoices_tech_idx on public.invoices (tech_user_id);
