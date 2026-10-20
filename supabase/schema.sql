-- Марафон Healthy Weight Loss: база даних для входу з поштою.
-- Виконайте один раз у Supabase: SQL Editor -> New query -> вставити -> Run.
create table if not exists public.trackers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.trackers enable row level security;
drop policy if exists "own select" on public.trackers;
create policy "own select" on public.trackers for select to authenticated using (user_id = auth.uid());
drop policy if exists "own insert" on public.trackers;
create policy "own insert" on public.trackers for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own update" on public.trackers;
create policy "own update" on public.trackers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
