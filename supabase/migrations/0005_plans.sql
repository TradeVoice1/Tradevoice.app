-- =============================================================================
-- Tradevoice — recurring maintenance plans
-- =============================================================================
-- A "plan" is a contracted recurring service for a client (e.g. annual HVAC
-- tune-up, quarterly fire-system inspection, monthly pool service). The owner
-- creates the plan once; the system tracks when it was last serviced and when
-- it's next due. Jobs created from a plan are linked back via jobs.plan_id so
-- completing a job auto-advances the plan's last_serviced_at + next_due_at.
-- =============================================================================

create table if not exists public.plans (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  client_id           uuid references public.clients(id) on delete set null,
  client_name         text,                                -- denormalized snapshot at create time
  title               text not null,                        -- e.g. "Annual HVAC Tune-Up"
  trade               text,
  frequency_months    int  not null default 12,             -- 1=monthly, 3=quarterly, 6=semi, 12=annual
  default_duration    numeric(4,1) default 2,               -- default job duration in hours
  default_tech_user_id uuid references auth.users(id) on delete set null,
  notes               text,
  active              boolean default true,
  started_at          date    not null default current_date,
  last_serviced_at    date,
  next_due_at         date    not null default current_date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists plans_owner_idx        on public.plans (owner_id);
create index if not exists plans_owner_due_idx    on public.plans (owner_id, next_due_at) where active;
create index if not exists plans_client_idx       on public.plans (client_id);

alter table public.plans enable row level security;

drop policy if exists "plans: owner all" on public.plans;
create policy "plans: owner all"
  on public.plans for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Reuse the updated_at trigger.
drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Link jobs to the plan they originated from (nullable — jobs can still be ad-hoc).
alter table public.jobs
  add column if not exists plan_id uuid references public.plans(id) on delete set null;

create index if not exists jobs_plan_idx on public.jobs (plan_id);
