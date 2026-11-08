-- Run in the Supabase SQL editor after 0002. All fixtures roll back.
begin;
insert into auth.users(id) values ('b734f634-ae6b-4ed2-8319-4cf3d1001001'), ('b734f634-ae6b-4ed2-8319-4cf3d1001002');
set local role authenticated;
select set_config('request.jwt.claim.sub','b734f634-ae6b-4ed2-8319-4cf3d1001001',true);
do $$
declare
 b text := 'wchal:' || to_char(now() at time zone 'utc','IYYY-"W"IW') || ':r1';
 n integer;
begin
 insert into public.scores(board,score,name) values (b,1900000,'Migration test');
 insert into public.scores(board,score,name) values (b,1910000,'Migration test') on conflict(user_id,board) do update set score=excluded.score;
 select score into n from public.scores where user_id=auth.uid() and board=b;
 if n <> 1910000 then raise exception 'faster time was not retained'; end if;
 update public.scores set score=1890000 where user_id=auth.uid() and board=b;
 select score into n from public.scores where user_id=auth.uid() and board=b;
 if n <> 1910000 then raise exception 'slower time replaced best'; end if;
 begin
  update public.scores set score=1995000 where user_id=auth.uid() and board=b;
  raise exception 'invalid time accepted';
 exception when others then
  if sqlerrm <> 'implausible challenge time' then raise; end if;
 end;
 begin
  update public.scores set board='classic:airport',score=1995000 where user_id=auth.uid() and board=b;
  raise exception 'board rename bypass accepted';
 exception when others then
  if sqlerrm <> 'implausible challenge time' then raise; end if;
 end;
 begin
  insert into public.scores(board,score,name) values ('wchal:2000-W01:r1',1900000,'Migration test');
  raise exception 'old week accepted';
 exception when others then
  if sqlerrm <> 'that challenge week is closed' then raise; end if;
 end;
 begin
  insert into public.scores(board,score,name) values ('wchal:bad',1900000,'Migration test');
  raise exception 'malformed board accepted';
 exception when others then
  if sqlerrm <> 'bad challenge board name' then raise; end if;
 end;
 perform set_config('request.jwt.claim.sub','b734f634-ae6b-4ed2-8319-4cf3d1001002',true);
 update public.scores set score=1920000 where board=b and user_id='b734f634-ae6b-4ed2-8319-4cf3d1001001';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'another user updated owner score'; end if;
 begin
  insert into public.scores(user_id,board,score,name) values ('b734f634-ae6b-4ed2-8319-4cf3d1001001',b,1920000,'Impersonator');
  raise exception 'impersonation accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select 'PASS: insert, faster/slower retry, invalid time/week/name, rename bypass, ownership; fixtures rolled back' as verification;
