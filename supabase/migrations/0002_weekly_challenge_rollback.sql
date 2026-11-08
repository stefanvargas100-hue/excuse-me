-- Undo 0002_weekly_challenge.sql. Existing wchal rows stay in the table (they are harmless); nobody can add or raise them any more
-- beyond the original one-insert rule. Safe to run again.
drop trigger if exists check_challenge on public.scores;
drop function if exists public.check_challenge_score();
drop policy if exists "raise own challenge time" on public.scores;
