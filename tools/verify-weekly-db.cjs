// Local PostgreSQL check. Install @electric-sql/pglite outside the repo, then set
// PGLITE_MODULE to its absolute module path and run: node tools/verify-weekly-db.cjs
// Uses an in-memory database; never connects to or modifies the live project.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
(async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role authenticated; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
   grant usage on schema auth to authenticated;`);
  await db.exec(fs.readFileSync('supabase/schema.sql', 'utf8'));
  const migration = fs.readFileSync('supabase/migrations/0002_weekly_challenge.sql', 'utf8');
  await db.exec(migration); await db.exec(migration);
  await db.exec(`grant usage on schema public to authenticated; grant select, insert, update on public.scores to authenticated; grant usage, select on all sequences in schema public to authenticated;
   set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';`);
  const week = (await db.query(`select to_char(now() at time zone 'utc', 'IYYY-"W"IW') as week`)).rows[0].week;
  const board = 'wchal:' + week + ':r1';
  const write = (b, score) => db.query(`insert into public.scores(board, score, name) values ($1, $2, 'Migration check') on conflict(user_id, board) do update set score = excluded.score`, [b, score]);
  const score = async () => (await db.query('select score from public.scores where board=$1', [board])).rows[0].score;
  await write(board, 1900000); await write(board, 1910000); assert.equal(await score(), 1910000);
  await write(board, 1890000); assert.equal(await score(), 1910000);
  for (const [b, s] of [['wchal:2000-W01:r1',1900000], [board,1995000], ['wchal:bad',1900000]]) await assert.rejects(write(b,s));
  await db.exec(`set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222'`);
  const foreign = await db.query('update public.scores set score=1920000 where board=$1 returning id', [board]);
  assert.equal(foreign.rows.length, 0, 'another player cannot update the owner row');
  await assert.rejects(db.query(`insert into public.scores(user_id,board,score,name) values ('11111111-1111-1111-1111-111111111111',$1,1920000,'Impersonator')`, [board]));
  await db.exec(`set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'`);
  // Updates must validate the actual retained board, even if a client tries to rename it.
  await assert.rejects(db.query(`update public.scores set board='classic:airport', score=1995000 where board=$1`, [board]), /implausible challenge time/);
  await write('classic:airport', 100); await write('classic:airport', 200);
  assert.equal((await db.query("select score from public.scores where board='classic:airport'")).rows[0].score, 200);
  await db.query("insert into public.scores(board,score,name) values ('daily:2026-11-07',100,'Migration check')");
  await assert.rejects(write('daily:2026-11-07', 200));
  await db.exec('reset role');
  const rollback = fs.readFileSync('supabase/migrations/0002_weekly_challenge_rollback.sql', 'utf8');
  await db.exec(rollback); await db.exec(rollback);
  await db.exec('set role authenticated');
  await assert.rejects(write(board, 1920000));
  console.log('PASS: repeat migration, insert, improve, keep best, bad week/time/name, owner isolation, board-change guard, classic/daily regression and repeat rollback');
 } finally { await db.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
