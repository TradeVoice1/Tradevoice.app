-- =============================================================================
-- Tradevoice — marketing automations (Phase 1: manual sends)
-- =============================================================================
-- Wires the Marketing screen to real outbound email via Resend.
--
-- Phase 1 (this migration + UI wiring):
--   - Manual "Send review requests to N clients" — owner picks clients, hits send
--   - Manual one-shot campaigns — owner writes subject + body, picks trade
--     filter, hits send; we fan out to all matching clients
--   - Persistent activity log so the Marketing → Overview tab shows real
--     "sent X review requests to N clients 3 days ago" history
--
-- Phase 2 (future, needs Vercel Cron):
--   - Trigger-based automations from the Automations tab (e.g. "invoice
--     marked paid → wait 2 days → send review request"). Today the tab is
--     visible but inert; toggling does nothing yet.
-- =============================================================================

-- ── Client-level review tracking ─────────────────────────────────────────────
-- review_requested_at: most-recent date we asked them for a review. Used to
-- dedupe ("you already asked Jane 3 days ago — skip her?") and to show "Asked
-- Mar 12" in the Reviews tab.
-- reviewed_at: when the owner manually marked the review as left, OR (future)
-- when a Google Places API webhook tells us the review showed up.
alter table public.clients
  add column if not exists review_requested_at timestamptz,
  add column if not exists reviewed_at         timestamptz;

create index if not exists clients_review_status_idx
  on public.clients (owner_id, reviewed_at);

-- ── marketing_campaigns — owner-created bulk-send "blasts" ───────────────────
-- Created BEFORE marketing_sends so the FK from sends → campaigns resolves.
-- One row per campaign the owner kicks off. The Campaigns tab lists these
-- with sent/opened/clicked stats. Opens/clicks land here once Resend's
-- webhook is wired (Phase 2).
create table if not exists public.marketing_campaigns (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  trade_filter    text,                 -- 'All' | 'Plumber' | 'HVAC' | ...
  subject         text not null,
  message         text not null,
  -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  status          text not null default 'draft',
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  sent_count      int default 0,
  opened_count    int default 0,
  clicked_count   int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists marketing_campaigns_owner_idx
  on public.marketing_campaigns (owner_id, created_at desc);

alter table public.marketing_campaigns enable row level security;

drop policy if exists "marketing_campaigns: owner all" on public.marketing_campaigns;
create policy "marketing_campaigns: owner all"
  on public.marketing_campaigns for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.marketing_campaigns;
create trigger set_updated_at before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

-- ── marketing_sends — log of every outbound message ─────────────────────────
-- One row per recipient per send. Lets us:
--   - render a real "Recent Activity" feed on the Marketing overview
--   - dedupe ("don't send this review request again within 14 days")
--   - debug deliverability (Resend message id + bounce/complaint webhooks
--     later flip the status here)
create table if not exists public.marketing_sends (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  client_id           uuid references public.clients(id) on delete set null,
  campaign_id         uuid references public.marketing_campaigns(id) on delete set null,
  -- 'review_request' | 'campaign' | 'automation' | 'reminder'
  type                text not null,
  recipient_email     text not null,
  recipient_name      text,
  subject             text,
  -- 'queued' | 'sent' | 'failed' | 'bounced' | 'complained'
  status              text not null default 'queued',
  resend_message_id   text,
  error_text          text,
  sent_at             timestamptz,
  created_at          timestamptz default now()
);

create index if not exists marketing_sends_owner_idx
  on public.marketing_sends (owner_id, created_at desc);
create index if not exists marketing_sends_client_idx
  on public.marketing_sends (client_id, type, created_at desc);
create index if not exists marketing_sends_resend_idx
  on public.marketing_sends (resend_message_id);

alter table public.marketing_sends enable row level security;

drop policy if exists "marketing_sends: owner read" on public.marketing_sends;
create policy "marketing_sends: owner read"
  on public.marketing_sends for select
  using (auth.uid() = owner_id);

-- Writes only via service-role (the serverless endpoints). The browser
-- never inserts into this table directly — keeps the activity log honest.

-- ── RPC: log a send + bump client.review_requested_at atomically ────────────
-- Called by the review-request API after Resend accepts a send. Service-role
-- only. Returns the inserted send row's id so the caller can reference it.
create or replace function public.log_marketing_send(
  p_owner_id          uuid,
  p_client_id         uuid,
  p_campaign_id       uuid,
  p_type              text,
  p_recipient_email   text,
  p_recipient_name    text,
  p_subject           text,
  p_status            text,
  p_resend_message_id text,
  p_error_text        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $mk1$
declare
  new_id uuid;
begin
  insert into public.marketing_sends (
    owner_id, client_id, campaign_id, type, recipient_email, recipient_name,
    subject, status, resend_message_id, error_text, sent_at
  ) values (
    p_owner_id, p_client_id, p_campaign_id, p_type, p_recipient_email, p_recipient_name,
    p_subject, p_status, p_resend_message_id, p_error_text,
    case when p_status = 'sent' then now() else null end
  )
  returning id into new_id;

  -- Bump the client's "last asked" timestamp so the UI can show
  -- "Asked Mar 12" and we can dedupe future review-request batches.
  if p_type = 'review_request' and p_status = 'sent' and p_client_id is not null then
    update public.clients
       set review_requested_at = now()
     where id = p_client_id;
  end if;

  return new_id;
end;
$mk1$;

grant execute on function public.log_marketing_send(uuid, uuid, uuid, text, text, text, text, text, text, text) to service_role;
