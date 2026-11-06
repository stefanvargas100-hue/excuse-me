-- Excuse Me leaderboards. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Also turn on: Authentication -> Sign In / Providers -> "Allow anonymous sign-ins".

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid(),
  board      text not null check (char_length(board) between 3 and 40),   -- e.g. daily:2026-11-06 or weekly:2026-W45
  score      integer not null check (score between 0 and 2000000),
  name       text not null check (char_length(name) between 1 and 24),
  created_at timestamptz not null default now(),
  unique (user_id, board)                                                 -- one try per player per board, enforced here
);

alter table public.scores enable row level security;

-- Anyone can read the boards.
drop policy if exists "boards are public" on public.scores;
create policy "boards are public" on public.scores for select using (true);

-- A signed-in (anonymous) player can add their own score only. No update, no delete: nobody can edit scores afterwards.
drop policy if exists "add own score" on public.scores;
create policy "add own score" on public.scores for insert to authenticated with check (user_id = auth.uid());

create index if not exists scores_board_score on public.scores (board, score desc);
