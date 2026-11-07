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

-- ---- Classic stage boards (board names start with "classic:"): a player's best score per stage, raised only. ----
-- Run this part too (it is safe to run again). Daily and weekly boards stay one-try: they cannot be updated.
drop policy if exists "raise own classic score" on public.scores;
create policy "raise own classic score" on public.scores for update to authenticated
  using (user_id = auth.uid() and board like 'classic:%')
  with check (user_id = auth.uid() and board like 'classic:%');

create or replace function public.keep_best_score() returns trigger language plpgsql as $$
begin
  new.score := greatest(old.score, new.score);   -- a lower score can never replace a higher one
  new.user_id := old.user_id; new.board := old.board;
  return new;
end $$;

drop trigger if exists keep_best on public.scores;
create trigger keep_best before update on public.scores for each row execute function public.keep_best_score();

-- ---- Player level, title and picture shown next to scores (run this part too; safe to run again) ----
-- These are reported by the phone, like the score. The game still works if this part has not been run yet.
alter table public.scores add column if not exists level integer not null default 1 check (level between 1 and 999);
alter table public.scores add column if not exists title text check (char_length(title) <= 30);
alter table public.scores add column if not exists pic   text check (char_length(pic) <= 8);

-- ---- Ghosts of the top 3 (run this part too; safe to run again) ----
-- A ghost is a run's path (a few KB of positions). The server keeps one only for the three best players of a classic stage, and
-- deletes it the moment its owner drops out of the top 3. Everyone else's ghost is never stored. Friends' ghosts never come here:
-- phones in a room swap them directly. The game works without this part; the top-3 ghosts just do not appear.
create table if not exists public.ghosts (
  user_id    uuid not null default auth.uid(),
  board      text not null check (board like 'classic:%' and char_length(board) between 9 and 40),
  score      integer not null check (score between 0 and 2000000),
  name       text not null check (char_length(name) between 1 and 24),
  path       text not null check (char_length(path) <= 12000),
  updated_at timestamptz not null default now(),
  primary key (user_id, board)
);

alter table public.ghosts enable row level security;

drop policy if exists "ghosts are public" on public.ghosts;
create policy "ghosts are public" on public.ghosts for select using (true);

-- True while this player's score is among the best three on the board.
create or replace function public.in_top3(b text, u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from (select user_id, row_number() over (order by score desc, created_at asc) as rn from public.scores where board = b) t
    where t.user_id = u and t.rn <= 3);
$$;

drop policy if exists "add own ghost while top 3" on public.ghosts;
create policy "add own ghost while top 3" on public.ghosts for insert to authenticated
  with check (user_id = auth.uid() and public.in_top3(board, auth.uid()));

drop policy if exists "replace own ghost while top 3" on public.ghosts;
create policy "replace own ghost while top 3" on public.ghosts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.in_top3(board, auth.uid()));

-- When a score changes the top 3, ghosts of anyone pushed out are removed.
create or replace function public.prune_ghosts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.ghosts g where g.board = new.board and not public.in_top3(g.board, g.user_id);
  return null;
end $$;

drop trigger if exists prune_ghosts_after on public.scores;
create trigger prune_ghosts_after after insert or update on public.scores for each row execute function public.prune_ghosts();
