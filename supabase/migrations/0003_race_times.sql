-- Race time boards: friendly, client-reported times. NOT APPLIED.
-- Score = 2000000 - finish milliseconds; faster is higher, reusing keep_best unchanged.
-- Apply only with Director approval; undo with 0003_race_times_rollback.sql.
drop policy if exists "raise own race time" on public.scores;
create policy "raise own race time" on public.scores for update to authenticated
  using (user_id = auth.uid() and board like 'race:%')
  with check (user_id = auth.uid() and board like 'race:%');

create or replace function public.check_race_score() returns trigger language plpgsql as $$
begin
  -- Validate the retained identity before keep_best runs, as in migration 0002.
  if TG_OP = 'UPDATE' then
    new.board := old.board;
    new.user_id := old.user_id;
  end if;
  if new.board like 'race:%' then
    if new.board !~ '^race:[a-z][a-z0-9_-]{0,34}$' then raise exception 'bad race board name'; end if;
    if new.score < 0 or new.score > 1999999 then raise exception 'invalid race time'; end if;
  end if;
  return new;
end $$;
drop trigger if exists check_race on public.scores;
create trigger check_race before insert or update on public.scores for each row execute function public.check_race_score();
