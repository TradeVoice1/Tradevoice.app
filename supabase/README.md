# Tradevoice — Supabase setup

## Run the initial migration

1. Open the Supabase dashboard for your project (`zslqxooswfpnkqyuulkr`).
2. Go to **SQL Editor** → **New query**.
3. Paste the entire contents of `migrations/0001_init.sql`.
4. Click **Run**. It should report success with no errors.

## What this gives you

- **`profiles`** — extends `auth.users` with business info. A row is auto-created when a user signs up (via the `on_auth_user_created` trigger).
- **`clients`** — owner-scoped client list.
- **`invoices`** — owner-scoped invoices, including denormalized client snapshot, line-items, payments, and activity log.
- **`quotes`** — owner-scoped quotes.
- **`jobs`** — owner-scoped scheduled jobs (used by ScheduleScreen).
- **`team_members`** — owner manages their team; team members can read their own row.

Every table has Row Level Security on. A user can only see and modify rows they own.

## Wiring the front-end

The app today still reads/writes from `useState`. Swapping each module to Supabase queries is the next step:

| Module               | Pattern                                                                                          |
|----------------------|--------------------------------------------------------------------------------------------------|
| Login / Signup       | `supabase.auth.signInWithPassword` / `supabase.auth.signUp`                                       |
| Profile bootstrap    | After login, `select * from profiles where id = auth.uid()`                                       |
| Invoices             | `select … from invoices where owner_id = auth.uid()`                                              |
| Quotes               | same shape as invoices                                                                            |
| Clients              | `select … from clients`                                                                          |
| Jobs                 | `select … from jobs where owner_id = auth.uid() order by date`                                   |
| Team                 | `select … from team_members where owner_id = auth.uid()`                                         |

Recommended approach: build a small `useSupabaseTable(table)` hook that returns `{ rows, insert, update, remove, loading }`, then replace the seed `useState` calls one feature at a time so you can keep shipping.

## Reset (development only)

If you need to wipe everything and re-run:

```sql
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;
drop function if exists public.set_updated_at;
drop table if exists public.team_members cascade;
drop table if exists public.jobs         cascade;
drop table if exists public.quotes       cascade;
drop table if exists public.invoices     cascade;
drop table if exists public.clients      cascade;
drop table if exists public.profiles     cascade;
```
