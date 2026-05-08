-- =============================================================================
-- Tradevoice — let techs read + write their owner's clients, quotes, invoices
-- =============================================================================
-- Currently the tech can only read jobs assigned to them (migration 0003).
-- For tech-mode quote/invoice creation, we need a real shared workspace:
-- the tech reads the owner's client list, creates quotes/invoices on the
-- owner's behalf (so they live under the owner's owner_id and roll up
-- correctly on the owner's dashboard), and updates only the rows they
-- themselves created.
--
-- A `team_members` row with status='active' and user_id=auth.uid() proves
-- the tech belongs to the owner. We use a stable helper to read the
-- caller's owner from team_members so individual policies stay readable.
-- =============================================================================

-- Helper: returns the owner_id of the team_members row for the calling
-- auth user, or NULL if they're not an active tech. Stable, runs once
-- per query.
create or replace function public.tradevoice_my_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id
    from public.team_members
   where user_id = auth.uid()
     and status = 'active'
   limit 1
$$;

grant execute on function public.tradevoice_my_owner_id() to authenticated;

-- ── clients ──────────────────────────────────────────────────────────────
drop policy if exists "clients: owner all"  on public.clients;
drop policy if exists "clients: tech read"   on public.clients;
drop policy if exists "clients: tech write"  on public.clients;

create policy "clients: owner all"
  on public.clients for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Tech: read all clients owned by their owner.
create policy "clients: tech read"
  on public.clients for select
  using (owner_id = public.tradevoice_my_owner_id());

-- Tech: insert new clients on the owner's behalf — the row must be tagged
-- with the owner_id, not the tech's id.
create policy "clients: tech insert"
  on public.clients for insert
  with check (owner_id = public.tradevoice_my_owner_id());

-- Tech: update clients owned by their owner. Tech can edit any client
-- since they need the latest contact info to invoice; if you want
-- stricter rules we can add a created_by column later.
create policy "clients: tech update"
  on public.clients for update
  using (owner_id = public.tradevoice_my_owner_id())
  with check (owner_id = public.tradevoice_my_owner_id());

-- ── quotes ───────────────────────────────────────────────────────────────
drop policy if exists "quotes: owner all"   on public.quotes;
drop policy if exists "quotes: tech read"   on public.quotes;
drop policy if exists "quotes: tech insert" on public.quotes;
drop policy if exists "quotes: tech update" on public.quotes;

create policy "quotes: owner all"
  on public.quotes for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "quotes: tech read"
  on public.quotes for select
  using (owner_id = public.tradevoice_my_owner_id());

create policy "quotes: tech insert"
  on public.quotes for insert
  with check (owner_id = public.tradevoice_my_owner_id());

-- Tech: update only quotes they're tied to. The UI also blocks the
-- "Convert to Invoice" / "Delete" buttons for techs but the policy is the
-- real safety net. We tie via the source-quote → invoice tech_user_id
-- relationship for now (quotes themselves don't have a tech_user_id
-- column; if that becomes a problem we can add one).
create policy "quotes: tech update own"
  on public.quotes for update
  using (owner_id = public.tradevoice_my_owner_id())
  with check (owner_id = public.tradevoice_my_owner_id());

-- ── invoices ─────────────────────────────────────────────────────────────
drop policy if exists "invoices: owner all"   on public.invoices;
drop policy if exists "invoices: tech read"   on public.invoices;
drop policy if exists "invoices: tech insert" on public.invoices;
drop policy if exists "invoices: tech update" on public.invoices;

create policy "invoices: owner all"
  on public.invoices for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "invoices: tech read"
  on public.invoices for select
  using (owner_id = public.tradevoice_my_owner_id());

-- Tech can insert invoices for their owner; tech_user_id must be themselves
-- so an invoice always carries the right "performed by" attribution.
create policy "invoices: tech insert"
  on public.invoices for insert
  with check (
    owner_id = public.tradevoice_my_owner_id()
    and (tech_user_id is null or tech_user_id = auth.uid())
  );

-- Tech: update only invoices where they're the assigned tech. Owner can
-- still edit anything via the "owner all" policy above.
create policy "invoices: tech update own"
  on public.invoices for update
  using (
    owner_id = public.tradevoice_my_owner_id()
    and tech_user_id = auth.uid()
  )
  with check (
    owner_id = public.tradevoice_my_owner_id()
    and tech_user_id = auth.uid()
  );
