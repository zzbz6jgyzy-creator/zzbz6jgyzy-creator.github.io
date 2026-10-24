import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch{({PGlite}=require('../dev/node_modules/@electric-sql/pglite'));}const M=require('../personal-model.js'),db=new PGlite();let checks=0;
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
await db.exec(fs.readFileSync('supabase/migrations/202610220001_members.sql','utf8'));
const sql=fs.readFileSync('supabase/migrations/202610240001_personal_home.sql','utf8');await db.exec(sql);await db.exec(sql);
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',U='00000000-0000-4000-8000-000000000003';await db.query('insert into auth.users values($1,now()),($2,now()),($3,null)',[A,B,U]);
async function role(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));}
async function rpc(id,name,args=[]){await role(id);return(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})as data`,args)).rows[0].data;}
async function no(id,name,args,match){await assert.rejects(rpc(id,name,args),match);checks++;}
try{
 await role(A);await assert.rejects(db.query('select * from sd_private.personal_homes'),/permission denied/);checks++;
 await no(null,'sd_personal_home',[],/permission denied/);await no(U,'sd_personal_home',[],/sign_in_required/);
 assert.deepEqual(await rpc(A,'sd_personal_home'),{document:null,revision:0});checks++;
 let doc=M.change(M.blank(),'name','Alex');doc=M.mark(doc,'saved','/dispatch/example-story.html',true);const first=await rpc(A,'sd_save_personal_home',[doc,0]);assert.equal(first.revision,1);checks++;
 assert.equal((await rpc(B,'sd_personal_home')).document,null);checks++;
 await no(A,'sd_save_personal_home',[doc,0],/revision_conflict/);
 for(const bad of [{},null,{...doc,fields:null},{...doc,schema:2},{...doc,schema:null},{...doc,schema:"1"},{...doc,fields:{...doc.fields,name:{value:null,at:0}}},{...doc,extra:true},{...doc,resetAt:Date.now()+172800000},{...doc,saved:{'https://evil.test':{value:true,at:Date.now()}}},{...doc,fields:{...doc.fields,topics:{value:['forged'],at:0}}},{...doc,read:null}])await no(A,'sd_save_personal_home',[bad,1],/invalid_document/);
 const own=await rpc(B,'sd_save_personal_home',[M.change(M.blank(),'name','Other reader'),0]);assert.equal(own.revision,1);checks++;
 assert.equal((await rpc(A,'sd_personal_home')).document.fields.name.value,'Alex');checks++;
 const update=await rpc(A,'sd_save_personal_home',[M.change(doc,'density','compact'),1]);assert.equal(update.revision,2);checks++;
 await no(A,'sd_save_personal_home',[doc,1],/revision_conflict/);
 const reset=await rpc(A,'sd_save_personal_home',[M.blank(Date.now()),2]);assert.deepEqual(reset.document.saved,{});checks++;
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[A]);assert.equal((await db.query('select count(*)as n from sd_private.personal_homes where user_id=$1',[A])).rows[0].n,0);checks++;
 console.log(checks+' database checks passed: private ownership, confirmed accounts, validation, revisions, reset and deletion cascade.');
}finally{await db.close();}
