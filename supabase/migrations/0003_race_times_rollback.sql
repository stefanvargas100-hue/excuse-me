-- Disable RACE_SUBMIT_ENABLED before rollback. Existing friendly times remain readable.
-- No data is deleted; the original one-insert policy still applies.
drop trigger if exists check_race on public.scores;
drop function if exists public.check_race_score();
drop policy if exists "raise own race time" on public.scores;
