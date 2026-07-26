-- Tradevoice — invoice markup disclosure setting
-- =============================================================================
-- Found walking the live app on 2026-07-26: the quote and the invoice
-- disclosed markup differently for the SAME job.
--
--   Quote:   "Materials & Parts  $101.20"        <- markup folded in, invisible
--   Invoice: "Markup (15%) — mat+equip  $13.20"  <- itemized in plain sight
--
-- Same total, but the invoice handed the customer a line item to argue with.
-- Most contractors deliberately bury margin inside unit pricing.
--
-- Rather than pick for everyone, this is now the contractor's call:
--   false (DEFAULT) — fold markup into the Materials & Parts total, matching
--                     how the quote has always rendered it.
--   true            — show "Markup (N%)" as its own line on the invoice.
--
-- Defaults to false so existing and new accounts get the discreet behavior
-- without any action; a contractor who wants full transparency opts in.
-- =============================================================================

alter table public.profiles
  add column if not exists show_markup_line boolean not null default false;

comment on column public.profiles.show_markup_line is
  'Invoice rendering: when true, markup appears as its own line item. When false (default), it is folded into the Materials & Parts total, matching the quote document.';
