-- Rate sheet permissions: admin-only by default, admin-granted read access.
-- =============================================================================
-- The rule (Matt, 2026-08-13): only the admin can view rate sheets, and only
-- the admin can grant someone else access. A grant NEVER exposes wages,
-- burden lines, overhead or profit — those tables keep zero tech-facing
-- policies. What a granted tech gets is the FINISHED product:
--
--   1. rate_sheets rows (name, status, per diem, markups, terms) — metadata
--      a granted estimator needs to quote from.
--   2. rate_equipment rows — the rental schedule is client-facing anyway.
--   3. rate_sheet_published_rates(sheet_id) — a SECURITY DEFINER function
--      that computes craft ST/OT/DT rates SERVER-SIDE with the additive
--      formula and returns only the results. The ingredients (wage, burden
--      percentages, profit) never cross the wire.
--
-- The grant lives where every other tech permission lives:
-- team_members.perms->>'viewRateSheets' — set by the owner in Settings →
-- Team, same checkbox UI as createQuotes etc. Only the owner can write
-- team_members rows (RLS from 0001), so only the admin can grant.
-- =============================================================================

-- ── Granted-tech read on sheet metadata ──────────────────────────────────────
drop policy if exists "rate_sheets: granted tech read" on public.rate_sheets;
create policy "rate_sheets: granted tech read" on public.rate_sheets
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.owner_id = rate_sheets.owner_id
        and tm.status = 'active'
        and coalesce(tm.perms->>'viewRateSheets', '') in ('true', '1')
    )
  );

drop policy if exists "rate_equipment: granted tech read" on public.rate_equipment;
create policy "rate_equipment: granted tech read" on public.rate_equipment
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.owner_id = rate_equipment.owner_id
        and tm.status = 'active'
        and coalesce(tm.perms->>'viewRateSheets', '') in ('true', '1')
    )
  );

-- Deliberately NO tech policies on rate_groups, rate_burden_lines or
-- rate_crafts. Wages stay with the owner at the database level.

-- ── Published rates, computed server-side ────────────────────────────────────
-- Same math as src/lib/rateMath.js (the unit-tested engine): percentages on
-- the base wage, summed. OT adds a half portion, DT a full portion, each with
-- its own burden subset and overhead/profit.
create or replace function public.rate_sheet_published_rates(p_sheet_id uuid)
returns table (
  g_name     text,
  g_sort     integer,
  craft_name text,
  craft_def  text,
  craft_sort integer,
  st_rate    numeric,
  ot_rate    numeric,
  dt_rate    numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed as (
    select 1
    from rate_sheets s
    where s.id = p_sheet_id
      and (
        s.owner_id = auth.uid()
        or exists (
          select 1 from team_members tm
          where tm.user_id = auth.uid()
            and tm.owner_id = s.owner_id
            and tm.status = 'active'
            and coalesce(tm.perms->>'viewRateSheets', '') in ('true', '1')
        )
      )
  ),
  sums as (
    select g.id as gid, g.name as gname, g.sort_order as gsort,
           g.oh_st, g.oh_ot, g.oh_dt, g.profit_st, g.profit_ot, g.profit_dt,
           coalesce(sum(l.pct) filter (where l.applies_st), 0) as b_st,
           coalesce(sum(l.pct) filter (where l.applies_ot), 0) as b_ot,
           coalesce(sum(l.pct) filter (where l.applies_dt), 0) as b_dt
    from rate_groups g
    left join rate_burden_lines l on l.group_id = g.id
    where g.sheet_id = p_sheet_id
    group by g.id
  )
  select u.gname, u.gsort, c.name, c.definition, c.sort_order,
         round(c.wage * (1 + (u.b_st + u.oh_st + u.profit_st) / 100), 4),
         round(c.wage * (1 + (u.b_st + u.oh_st + u.profit_st) / 100)
             + (c.wage * 0.5) * (1 + (u.b_ot + u.oh_ot + u.profit_ot) / 100), 4),
         round(c.wage * (1 + (u.b_st + u.oh_st + u.profit_st) / 100)
             +  c.wage        * (1 + (u.b_dt + u.oh_dt + u.profit_dt) / 100), 4)
  from sums u
  join rate_crafts c on c.group_id = u.gid
  where exists (select 1 from allowed)
  order by u.gsort, c.sort_order;
$$;

revoke execute on function public.rate_sheet_published_rates(uuid) from public;
revoke execute on function public.rate_sheet_published_rates(uuid) from anon;
grant  execute on function public.rate_sheet_published_rates(uuid) to authenticated;
