-- =============================================================================
-- Tradevoice — initial schema (profiles, clients, invoices, quotes, jobs, team)
-- =============================================================================
-- Paste this entire file into the Supabase SQL editor and run it. Idempotent
-- enough to re-run during early development; do NOT re-run in production once
-- real data is present. Each table is owner-scoped via Row Level Security.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- profiles — extends auth.users with business info
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  company         text,
  phone           text,
  trades          text[]      default '{}',
  specialty_types text[]      default '{}',
  work_type       text,                                       -- 'Residential' | 'Commercial' | 'Both'
  states          text[]      default '{}',
  tagline         text,
  license         text,
  accent_color    text,
  default_terms   text,
  plan            text,                                       -- 'solo' | 'pro' | 'all'
  role            text        default 'owner',                -- 'owner' | 'tech'
  company_code    text        unique,
  accepted_terms_at timestamptz,
  logo_url        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists profiles_company_code_idx on public.profiles (company_code);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  company     text,
  email       text,
  phone       text,
  address     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists clients_owner_idx on public.clients (owner_id);

alter table public.clients enable row level security;

drop policy if exists "clients: owner all" on public.clients;
create policy "clients: owner all"
  on public.clients for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- invoices
-- -----------------------------------------------------------------------------
create table if not exists public.invoices (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  number          text not null,
  title           text,
  trade           text,
  status          text default 'draft',                       -- draft|sent|viewed|partial|paid|overdue|void
  terms           text,
  created_at_date date,
  due_at          date,
  paid_at         date,
  -- Denormalized client snapshot at time of issue (so the doc stays correct even if the client is edited later)
  client_name     text,
  client_email    text,
  client_phone    text,
  client_address  text,
  -- Line items
  labor           jsonb default '[]'::jsonb,
  materials       jsonb default '[]'::jsonb,
  equipment       jsonb default '[]'::jsonb,
  markup          numeric(6,2) default 0,
  tax             numeric(6,2) default 0,
  notes           text,
  payments        jsonb default '[]'::jsonb,
  activity        jsonb default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (owner_id, number)
);

create index if not exists invoices_owner_idx        on public.invoices (owner_id);
create index if not exists invoices_owner_status_idx on public.invoices (owner_id, status);
create index if not exists invoices_owner_due_idx    on public.invoices (owner_id, due_at);

alter table public.invoices enable row level security;

drop policy if exists "invoices: owner all" on public.invoices;
create policy "invoices: owner all"
  on public.invoices for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- quotes
-- -----------------------------------------------------------------------------
create table if not exists public.quotes (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  number          text not null,
  title           text,
  trade           text,
  status          text default 'draft',                       -- draft|sent|accepted|declined|revised|invoiced
  scope           text,
  field_notes     text,
  labor           jsonb default '[]'::jsonb,
  materials       jsonb default '[]'::jsonb,
  equipment       jsonb default '[]'::jsonb,
  markup          numeric(6,2) default 0,
  tax             numeric(6,2) default 0,
  terms           text,
  created_at_date date,
  sent_at_date    date,
  expires_at      date,
  revision_of     text,
  revision_number int default 1,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (owner_id, number)
);

create index if not exists quotes_owner_idx on public.quotes (owner_id);

alter table public.quotes enable row level security;

drop policy if exists "quotes: owner all" on public.quotes;
create policy "quotes: owner all"
  on public.quotes for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- jobs (Schedule)
-- -----------------------------------------------------------------------------
create table if not exists public.jobs (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  invoice_id  uuid references public.invoices(id) on delete set null,
  tech_user_id uuid references auth.users(id) on delete set null,
  title       text,
  address     text,
  phone       text,
  date        timestamptz,
  start_hour  int,
  duration    int,
  status      text default 'scheduled',                       -- scheduled|in-progress|completed|cancelled
  trade       text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists jobs_owner_date_idx on public.jobs (owner_id, date);

alter table public.jobs enable row level security;

drop policy if exists "jobs: owner all" on public.jobs;
create policy "jobs: owner all"
  on public.jobs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- team_members
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade, -- the boss
  user_id     uuid references auth.users(id) on delete set null,         -- null until invite accepted
  name        text,
  email       text,
  role        text default 'tech',
  trades      text[] default '{}',
  status      text default 'pending',                                    -- pending|active|removed
  perms       jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists team_owner_idx on public.team_members (owner_id);
create index if not exists team_user_idx  on public.team_members (user_id);

alter table public.team_members enable row level security;

-- Owner can manage their team. The team member themselves can read their own row.
drop policy if exists "team: owner manage" on public.team_members;
drop policy if exists "team: self read"    on public.team_members;

create policy "team: owner manage"
  on public.team_members for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "team: self read"
  on public.team_members for select
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger (used on every table above)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text;
begin
  for t in select unnest(array['profiles','clients','invoices','quotes','jobs','team_members']) loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
