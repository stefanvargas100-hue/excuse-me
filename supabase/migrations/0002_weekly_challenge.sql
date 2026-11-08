-- Weekly challenge boards (rules version 1). Locally checked with PostgreSQL/PGlite; NOT YET APPLIED OR TESTED against the live Supabase project.
-- Until this has been run and checked, the game keeps CHALLENGE_SUBMIT_ENABLED = false (src/config/challenge.js) and never sends challenge times.
--
-- Board names look like  wchal:2026-W46:r1  (UTC ISO week, rules version).
-- The score is  2000000 - finish time in milliseconds, so a faster time is a higher score and the existing "highest first" boards,
-- the "keep_best" trigger and the 0..2000000 check all keep working unchanged.
--
-- What the database enforces (and what it cannot):
--   * only the owner can raise their own row, and only on wchal boards (like the classic boards);
--   * the board name must be well formed and the time must be between 20 s and 600 s;
--   * only the current UTC week can be written, plus the previous week for 6 hours after the Monday 00:00 UTC reset, so a run that
--     started before the reset can still be filed under its own week.
-- It cannot tell a real run from a made-up time inside that band: a phone reports its own time. Treat the board as friendly, not secure.
--
-- Apply: Supabase -> SQL Editor -> paste -> Run. Safe to run again. Undo with 0002_weekly_challenge_rollback.sql.

drop policy if exists "raise own challenge time" on public.scores;
create policy "raise own challenge time" on public.scores for update to authenticated
  using (user_id = auth.uid() and board like 'wchal:%')
  with check (user_id = auth.uid() and board like 'wchal:%');

create or replace function public.check_challenge_score() returns trigger language plpgsql as $$
declare
  ms  integer;
  wk  text;
  cur text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
  prev text := to_char((now() - interval '6 hours') at time zone 'utc', 'IYYY-"W"IW');
begin
  -- keep_best runs after this trigger. Validate the board that will actually be retained,
  -- rather than a client-supplied rename that keep_best would later discard.
  if TG_OP = 'UPDATE' then
    new.board := old.board;
    new.user_id := old.user_id;
  end if;
  if new.board like 'wchal:%' then
    if new.board !~ '^wchal:[0-9]{4}-W[0-9]{2}:r[0-9]{1,3}$' then raise exception 'bad challenge board name'; end if;
    ms := 2000000 - new.score;
    if ms < 20000 or ms > 600000 then raise exception 'implausible challenge time'; end if;
    wk := split_part(new.board, ':', 2);
    if wk <> cur and wk <> prev then raise exception 'that challenge week is closed'; end if;
  end if;
  return new;
end $$;

drop trigger if exists check_challenge on public.scores;
create trigger check_challenge before insert or update on public.scores for each row execute function public.check_challenge_score();
