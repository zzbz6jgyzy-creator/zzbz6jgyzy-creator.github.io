import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let PGlite;
try{({PGlite}=require('@electric-sql/pglite'));}catch{({PGlite}=require('../dev/node_modules/@electric-sql/pglite'));}
const db=new PGlite();let checks=0;
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
await db.exec(readFileSync(new URL('../supabase/migrations/202610220001_members.sql',import.meta.url),'utf8'));
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',M='00000000-0000-4000-8000-000000000003',U='00000000-0000-4000-8000-000000000004';
await db.query(`insert into auth.users values ($1,now()),($2,now()),($3,now()),($4,null)`,[A,B,M,U]);
async function role(id){await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));}
async function call(id,name,args=[]){await role(id);return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as data`,args)).rows[0].data;}
async function rejects(id,name,args,pattern){await assert.rejects(call(id,name,args),pattern);checks++;}
async function admin(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
function ok(value){assert.ok(value);checks++;}
async function waitReset(id){await admin('update sd_private.members set last_post_at=null,last_vote_at=null where id=$1',[id]);}
const art='/dispatch/test-story.html',other='/dispatch/other-story.html';let nonce=0;const next=()=>`10000000-0000-4000-8000-${String(++nonce).padStart(12,'0')}`;
try{
 await role(null);await assert.rejects(db.query('select * from sd_private.comments'),/permission denied/);checks++;
 await rejects(null,'sd_post_comment',[art,'Anonymous',next(),null],/permission denied/);
 await rejects(U,'sd_member_profile',[],/sign_in_required/);
 ok((await call(null,'sd_comments',[art])).items.length===0);
 for(const [id,name] of [[A,'Alice'],[B,'Bob'],[M,'Alex R']]){
  const initial=await call(id,'sd_member_profile');ok(!initial.accepted&&!initial.moderator);
  await call(id,'sd_set_profile',[name,true]);
 }
 await rejects(B,'sd_set_profile',['aLiCe',true],/name_taken/);
 await rejects(B,'sd_set_profile',['bob@example.com',true],/invalid_name/);
 await rejects(B,'sd_set_profile',['Bob',false],/rules_required/);
 await admin('update sd_private.members set moderator=true where id=$1',[M]);
 const first=await call(A,'sd_post_comment',[art,'First comment',next(),null]);ok(first.status==='published');
 ok((await call(null,'sd_comments',[art])).items.length===1);
 ok((await call(B,'sd_comments',[art])).items.length===1);
 const mine=await call(A,'sd_comments',[art]);ok(mine.items[0].own&&mine.items[0].status==='published');ok(mine.count===1);
 await rejects(A,'sd_moderate',[first.id,'approve'],/not_allowed/);
 await rejects(A,'sd_moderation_queue',[],/not_allowed/);
 const pub=await call(null,'sd_comments',[art]);ok(pub.items[0].body==='First comment'&&pub.count===1);
 ok(!JSON.stringify(pub).includes(A)&&!JSON.stringify(pub).includes('email'));
 const n=next();await waitReset(A);const retry=await call(A,'sd_post_comment',[art,'Retry-safe',n,null]);
 ok((await call(A,'sd_post_comment',[art,'Retry-safe',n,null])).id===retry.id);
 await rejects(A,'sd_post_comment',[other,'Retry-safe',n,null],/invalid_request/);
 await rejects(A,'sd_post_comment',[art,'Too fast',next(),null],/post_rate_limit/);
 await waitReset(B);await rejects(B,'sd_post_comment',[other,'Cross-article reply',next(),first.id],/invalid_reply/);
 const reply=await call(B,'sd_post_comment',[art,'A reply',next(),first.id]);
 ok((await call(null,'sd_comments',[art])).items.find(x=>x.id===first.id).replies===1);
 await waitReset(B);await rejects(B,'sd_post_comment',[art,'Nested reply',next(),reply.id],/invalid_reply/);
 await rejects(B,'sd_post_comment',[art,'',next(),null],/invalid_comment/);
 await rejects(B,'sd_post_comment',[art,'x'.repeat(3001),next(),null],/invalid_comment/);
 await rejects(B,'sd_post_comment',['//evil.example/a','test',next(),null],/invalid_article/);
 await rejects(null,'sd_vote',[art,true,null],/permission denied/);
 const v=await call(B,'sd_vote',[art,true,null]);ok(v.likes===1&&v.liked);
 ok((await call(B,'sd_vote',[art,true,null])).likes===1);
 await rejects(B,'sd_vote',[art,false,null],/vote_rate_limit/);
 await waitReset(B);ok((await call(B,'sd_vote',[art,false,null])).likes===0);
 await waitReset(B);ok((await call(B,'sd_vote',[art,true,first.id])).likes===1);
 await waitReset(B);await rejects(B,'sd_vote',[other,true,first.id],/comment_not_found/);
 await rejects(B,'sd_vote',[art,true,'99999'],/comment_not_found/);
 await rejects(A,'sd_report_comment',[first.id,'spam',''],/comment_not_found/);
 await call(B,'sd_report_comment',[first.id,'spam','Looks suspicious']);
 await call(B,'sd_report_comment',[first.id,'spam','Duplicate retry']);
 const reported=await call(M,'sd_moderation_queue',['reported']);ok(reported.length===1&&reported[0].reports.length===1);
 await call(M,'sd_moderate',[first.id,'dismiss']);ok((await call(M,'sd_moderation_queue',['reported'])).length===0);
 await rejects(B,'sd_delete_comment',[first.id],/comment_not_found/);
 await call(A,'sd_delete_comment',[first.id]);
 const deleted=await call(null,'sd_comments',[art]);ok(deleted.items.find(x=>x.id===first.id).status==='deleted'&&deleted.items.find(x=>x.id===first.id).body===null&&deleted.items.find(x=>x.id===first.id).replies===1);
 ok((await call(null,'sd_comments',[art,first.id])).items[0].body==='A reply');
 await admin('update sd_private.members set posts_today=30,post_day=current_date,last_post_at=null where id=$1',[A]);
 await rejects(A,'sd_post_comment',[art,'Over cap',next(),null],/daily_post_limit/);
 await call(M,'sd_moderate',[reply.id,'block']);
 await rejects(B,'sd_vote',[art,true,null],/account_blocked/);
 await rejects(B,'sd_post_comment',[art,'Blocked',next(),null],/account_blocked/);
 ok((await call(B,'sd_member_profile')).blocked);
 await role(A);await assert.rejects(db.query('update sd_private.members set moderator=true'),/permission denied/);checks++;
 await admin(`insert into sd_private.comments(article,body,status,published_at,nonce) select $1,'Page '||i,'published',now(),('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,40) i`,[other]);
 const page=await call(null,'sd_comments',[other,null,null,200]);ok(page.items.length===30&&page.next);
 const page2=await call(null,'sd_comments',[other,null,page.next,30]);ok(page2.items.length===10&&page2.next===null);ok(!page2.items.some(x=>page.items.some(y=>x.id===y.id)));
 ok((await call(null,'sd_comments',[other,null,null,-100])).items.length===1);
 await role(null);await assert.rejects(db.query('select * from sd_private.members'),/permission denied/);checks++;
 console.log(`PASS ${checks} database assertions: authorization, private data, moderation, replies, rate limits, vote uniqueness/idempotency, deletion and pagination.`);
}finally{await db.close();}
