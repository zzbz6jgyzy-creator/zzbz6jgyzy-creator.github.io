-- Supercharged Daily members. Run once in the Supabase SQL Editor.
-- Application data stays in an unexposed schema. Only bounded RPCs are public.
begin;
create schema if not exists sd_private;
revoke all on schema sd_private from public, anon, authenticated;
create table sd_private.members (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text unique check (display_name is null or (char_length(display_name) between 2 and 40 and display_name !~ '[<>@[:cntrl:]]')),
 moderator boolean not null default false, blocked boolean not null default false,
 accepted_at timestamptz, created_at timestamptz not null default now(),
 last_post_at timestamptz, last_vote_at timestamptz, post_day date, posts_today integer not null default 0,
 vote_day date, votes_today integer not null default 0, report_day date, reports_today integer not null default 0
);
create unique index sd_member_name on sd_private.members(lower(display_name)) where display_name is not null;
create table sd_private.comments (
 id bigint generated always as identity primary key,
 article text not null check (article ~ '^/dispatch/[a-z0-9]+(-[a-z0-9]+)*[.]html$'),
 parent_id bigint references sd_private.comments(id),
 member_id uuid references sd_private.members(id) on delete set null,
 body text not null check (char_length(body) <= 3000),
 status text not null default 'published' check (status in ('published','deleted')),
 created_at timestamptz not null default clock_timestamp(), published_at timestamptz not null default clock_timestamp(),
 nonce uuid not null, unique(member_id,nonce)
);
create index sd_comment_thread on sd_private.comments(article,parent_id,id desc);
create index sd_comment_queue on sd_private.comments(status,id);
create table sd_private.reactions (
 member_id uuid not null references sd_private.members(id) on delete cascade,
 article text not null check (article ~ '^/dispatch/[a-z0-9]+(-[a-z0-9]+)*[.]html$'),
 comment_id bigint references sd_private.comments(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
create unique index sd_article_vote on sd_private.reactions(member_id,article) where comment_id is null;
create unique index sd_comment_vote on sd_private.reactions(member_id,comment_id) where comment_id is not null;
create index sd_vote_counts on sd_private.reactions(article,comment_id);
create table sd_private.reports (
 id bigint generated always as identity primary key,
 member_id uuid not null references sd_private.members(id) on delete cascade,
 comment_id bigint not null references sd_private.comments(id) on delete cascade,
 reason text not null check (reason in ('spam','abuse','other')),
 details text not null default '' check (char_length(details)<=500),
 created_at timestamptz not null default clock_timestamp(), resolved_at timestamptz,
 unique(member_id,comment_id)
);
create index sd_open_reports on sd_private.reports(comment_id) where resolved_at is null;
alter table sd_private.members enable row level security;
alter table sd_private.comments enable row level security;
alter table sd_private.reactions enable row level security;
alter table sd_private.reports enable row level security;
revoke all on all tables in schema sd_private from public, anon, authenticated;
revoke all on all sequences in schema sd_private from public, anon, authenticated;

create function sd_private.current_member() returns sd_private.members
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; u uuid := auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'sign_in_required'; end if;
 insert into sd_private.members(id) values(u) on conflict(id) do nothing;
 select * into m from sd_private.members where id=u for update;
 return m;
end $$;
create function sd_private.ready_member() returns sd_private.members
language plpgsql security definer set search_path='' as $$
declare m sd_private.members;
begin
 m:=sd_private.current_member();
 if m.blocked then raise exception 'account_blocked'; end if;
 if m.display_name is null or m.accepted_at is null then raise exception 'profile_required'; end if;
 return m;
end $$;
create function sd_private.check_article(p_article text) returns void
language plpgsql immutable set search_path='' as $$
begin
 if p_article is null or length(p_article)>180 or p_article !~ '^/dispatch/[a-z0-9]+(-[a-z0-9]+)*[.]html$' then raise exception 'invalid_article'; end if;
end $$;

create function public.sd_member_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare m sd_private.members;
begin m:=sd_private.current_member(); return jsonb_build_object('display_name',m.display_name,'moderator',m.moderator,'blocked',m.blocked,'accepted',m.accepted_at is not null); end $$;
create function public.sd_set_profile(p_name text,p_accept boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; n text:=btrim(p_name);
begin
 m:=sd_private.current_member();
 if m.blocked then raise exception 'account_blocked'; end if;
 if p_accept is distinct from true then raise exception 'rules_required'; end if;
 if n is null or char_length(n) not between 2 and 40 or n ~ '[<>@[:cntrl:]]' then raise exception 'invalid_name'; end if;
 update sd_private.members set display_name=n,accepted_at=coalesce(accepted_at,clock_timestamp()) where id=m.id;
 return public.sd_member_profile();
exception when unique_violation then raise exception 'name_taken';
end $$;

create function public.sd_comments(p_article text,p_parent bigint default null,p_before bigint default null,p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare rows_json jsonb; next_id text; lim integer:=greatest(1,least(coalesce(p_limit,20),30)); u uuid:=auth.uid();
begin
 perform sd_private.check_article(p_article);
 with page as (
  select c.* from sd_private.comments c where c.article=p_article and c.parent_id is not distinct from p_parent
  and (p_before is null or c.id<p_before)
  and (c.status='published' or (c.status='deleted' and c.published_at is not null) )
  order by c.id desc limit lim+1
 ), shown as (select * from page order by id desc limit lim)
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id::text,'parent_id',c.parent_id::text,'body',case when c.status='deleted' then null else c.body end,
  'created_at',c.created_at,'name',case when c.status='deleted' then null else coalesce(m.display_name,'Former member') end,
  'moderator',coalesce(m.moderator,false),'own',coalesce(c.member_id=u,false),'status',c.status,
  'likes',(select count(*) from sd_private.reactions r where r.comment_id=c.id),
  'liked',exists(select 1 from sd_private.reactions r where r.comment_id=c.id and r.member_id=u),
  'replies',(select count(*) from sd_private.comments q where q.parent_id=c.id and (q.status='published' or (q.status='deleted' and q.published_at is not null) ))
 ) order by c.id desc),'[]'::jsonb),
 case when (select count(*) from page)>lim then min(c.id)::text else null end
 into rows_json,next_id from shown c left join sd_private.members m on m.id=c.member_id;
 return jsonb_build_object('items',rows_json,'next',next_id,
 'likes',(select count(*) from sd_private.reactions where article=p_article and comment_id is null),
 'liked',exists(select 1 from sd_private.reactions where article=p_article and comment_id is null and member_id=u),
 'count',(select count(*) from sd_private.comments where article=p_article and status='published'));
end $$;

create function public.sd_post_comment(p_article text,p_body text,p_nonce uuid,p_parent bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; c sd_private.comments; b text:=btrim(p_body); t timestamptz:=clock_timestamp();
begin
 m:=sd_private.ready_member(); perform sd_private.check_article(p_article);
 if p_nonce is null then raise exception 'invalid_request'; end if;
 select * into c from sd_private.comments where member_id=m.id and nonce=p_nonce;
 if found then
  if c.article<>p_article or c.parent_id is distinct from p_parent or c.body<>b then raise exception 'invalid_request'; end if;
  return jsonb_build_object('id',c.id::text,'status',c.status);
 end if;
 if b is null or char_length(b) not between 1 and 3000 or b ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' then raise exception 'invalid_comment'; end if;
 if m.last_post_at>t-interval '20 seconds' then raise exception 'post_rate_limit'; end if;
 if m.post_day=current_date and m.posts_today>=30 then raise exception 'daily_post_limit'; end if;
 if p_parent is not null and not exists(select 1 from sd_private.comments where id=p_parent and article=p_article and parent_id is null and (status='published' or (status='deleted' and published_at is not null))) then raise exception 'invalid_reply'; end if;
 insert into sd_private.comments(article,parent_id,member_id,body,status,published_at,nonce)
 values(p_article,p_parent,m.id,b,'published',t,p_nonce) returning * into c;
 update sd_private.members set last_post_at=t,post_day=current_date,posts_today=case when post_day=current_date then posts_today+1 else 1 end where id=m.id;
 return jsonb_build_object('id',c.id::text,'status',c.status);
end $$;
create function public.sd_delete_comment(p_id bigint) returns void
language plpgsql security definer set search_path='' as $$
declare m sd_private.members;
begin
 m:=sd_private.current_member();
 update sd_private.comments set body='',status='deleted' where id=p_id and member_id=m.id;
 if not found then raise exception 'comment_not_found'; end if;
 delete from sd_private.reactions where comment_id=p_id;
end $$;
create function public.sd_vote(p_article text,p_active boolean,p_comment bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; t timestamptz:=clock_timestamp(); active_now boolean;
begin
 m:=sd_private.ready_member(); perform sd_private.check_article(p_article);
 if p_active is null then raise exception 'invalid_request'; end if;
 if p_comment is not null and not exists(select 1 from sd_private.comments where id=p_comment and article=p_article and status='published') then raise exception 'comment_not_found'; end if;
 select exists(select 1 from sd_private.reactions where member_id=m.id and article=p_article and comment_id is not distinct from p_comment) into active_now;
 if active_now is distinct from p_active then
  if m.last_vote_at>t-interval '500 milliseconds' then raise exception 'vote_rate_limit'; end if;
  if m.vote_day=current_date and m.votes_today>=200 then raise exception 'daily_vote_limit'; end if;
  if p_active then insert into sd_private.reactions(member_id,article,comment_id) values(m.id,p_article,p_comment) on conflict do nothing;
  else delete from sd_private.reactions where member_id=m.id and article=p_article and comment_id is not distinct from p_comment; end if;
  update sd_private.members set last_vote_at=t,vote_day=current_date,votes_today=case when vote_day=current_date then votes_today+1 else 1 end where id=m.id;
 end if;
 return jsonb_build_object('liked',p_active,'likes',(select count(*) from sd_private.reactions where article=p_article and comment_id is not distinct from p_comment));
end $$;
create function public.sd_report_comment(p_id bigint,p_reason text,p_details text default '') returns void
language plpgsql security definer set search_path='' as $$
declare m sd_private.members;
begin
 m:=sd_private.ready_member();
 if p_reason is null or p_reason not in ('spam','abuse','other') or length(coalesce(p_details,''))>500 then raise exception 'invalid_report'; end if;
 if not exists(select 1 from sd_private.comments where id=p_id and status='published' and member_id is distinct from m.id) then raise exception 'comment_not_found'; end if;
 if exists(select 1 from sd_private.reports where member_id=m.id and comment_id=p_id) then return; end if;
 if m.report_day=current_date and m.reports_today>=10 then raise exception 'report_rate_limit'; end if;
 insert into sd_private.reports(member_id,comment_id,reason,details) values(m.id,p_id,p_reason,coalesce(p_details,''));
 update sd_private.members set report_day=current_date,reports_today=case when report_day=current_date then reports_today+1 else 1 end where id=m.id;
end $$;
create function public.sd_moderation_queue(p_mode text default 'recent') returns jsonb
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; result jsonb;
begin
 m:=sd_private.ready_member(); if not m.moderator then raise exception 'not_allowed'; end if;
 if p_mode is null or p_mode not in ('recent','reported') then raise exception 'invalid_request'; end if;
 select coalesce(jsonb_agg(x.data order by x.id desc),'[]'::jsonb) into result from (
  select c.id,jsonb_build_object('id',c.id::text,'article',c.article,'parent_id',c.parent_id::text,'body',c.body,'created_at',c.created_at,'name',coalesce(n.display_name,'Former member'),'status',c.status,
   'reports',coalesce((select jsonb_agg(jsonb_build_object('reason',r.reason,'details',r.details)) from sd_private.reports r where r.comment_id=c.id and r.resolved_at is null),'[]'::jsonb)) data
  from sd_private.comments c left join sd_private.members n on n.id=c.member_id
  where (p_mode='recent' and c.status='published') or (p_mode='reported' and c.status='published' and exists(select 1 from sd_private.reports r where r.comment_id=c.id and r.resolved_at is null))
  order by c.id desc limit 50
 ) x;
 return result;
end $$;
create function public.sd_moderate(p_id bigint,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare m sd_private.members; c sd_private.comments;
begin
 m:=sd_private.ready_member(); if not m.moderator then raise exception 'not_allowed'; end if;
 select * into c from sd_private.comments where id=p_id for update;
 if not found then raise exception 'comment_not_found'; end if;
 if p_action='remove' then
  update sd_private.comments set status='deleted',body='' where id=p_id;
  delete from sd_private.reactions where comment_id=p_id;
 elsif p_action='block' then
  if c.member_id is null or exists(select 1 from sd_private.members where id=c.member_id and moderator) then raise exception 'not_allowed'; end if;
  update sd_private.members set blocked=true where id=c.member_id;
  update sd_private.comments set status='deleted',body='' where member_id=c.member_id;
  delete from sd_private.reactions where member_id=c.member_id or comment_id in (select id from sd_private.comments where member_id=c.member_id);
 elsif p_action<>'dismiss' or p_action is null then raise exception 'invalid_request'; end if;
 update sd_private.reports set resolved_at=clock_timestamp() where comment_id=p_id;
end $$;
-- All functions start closed. Grant only intended entry points.
revoke all on all functions in schema sd_private from public, anon, authenticated;
revoke all on function public.sd_member_profile(),public.sd_set_profile(text,boolean),public.sd_comments(text,bigint,bigint,integer),public.sd_post_comment(text,text,uuid,bigint),public.sd_delete_comment(bigint),public.sd_vote(text,boolean,bigint),public.sd_report_comment(bigint,text,text),public.sd_moderation_queue(text),public.sd_moderate(bigint,text) from public, anon, authenticated;
grant execute on function public.sd_comments(text,bigint,bigint,integer) to anon, authenticated;
grant execute on function public.sd_member_profile(),public.sd_set_profile(text,boolean),public.sd_post_comment(text,text,uuid,bigint),public.sd_delete_comment(bigint),public.sd_vote(text,boolean,bigint),public.sd_report_comment(bigint,text,text),public.sd_moderation_queue(text),public.sd_moderate(bigint,text) to authenticated;
notify pgrst,'reload schema';
commit;
