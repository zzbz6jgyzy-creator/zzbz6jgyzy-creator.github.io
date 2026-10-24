-- Supercharged Daily: private cross-device personal homes.
-- Run this complete script in the existing project's SQL Editor. No secret keys go in the website.
begin;
create schema if not exists sd_private;
revoke all on schema sd_private from public, anon, authenticated;
create table if not exists sd_private.personal_homes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null,
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default clock_timestamp()
);
alter table sd_private.personal_homes enable row level security;
revoke all on sd_private.personal_homes from public, anon, authenticated;

create or replace function sd_private.valid_personal_home(d jsonb)
returns boolean language plpgsql stable set search_path=pg_catalog as $$
declare k text; e jsonb; v jsonb; u text; f jsonb; cap integer; limit_at bigint:=floor(extract(epoch from now())*1000)::bigint+86400000;
begin
 if d is null or jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>65536
  or not(d ?& array['schema','resetAt','fields','saved','read','hidden'])
  or (select count(*) from jsonb_object_keys(d))<>6
  or d->'schema' is distinct from '1'::jsonb or jsonb_typeof(d->'resetAt') is distinct from 'number'
  or (d->>'resetAt')!~'^[0-9]{1,15}$' then return false; end if;
 if (d->>'resetAt')::bigint>limit_at then return false; end if;
 f:=d->'fields';
 if jsonb_typeof(f) is distinct from 'object' or (select count(*)from jsonb_object_keys(f))<>6 then return false; end if;
 for k,e in select * from jsonb_each(f) loop
  if k not in ('name','topics','tools','density','sections','focus') or jsonb_typeof(e) is distinct from 'object'
   or (select count(*)from jsonb_object_keys(e))<>2 or not(e?'value' and e?'at')
   or jsonb_typeof(e->'at') is distinct from 'number' or (e->>'at')!~'^[0-9]{1,15}$' then return false; end if;
  if (e->>'at')::bigint>limit_at then return false; end if;
  v:=e->'value';
  if k='name' and (jsonb_typeof(v) is distinct from 'string' or char_length(e->>'value')>40 or (e->>'value')~'[<>[:cntrl:]]') then return false; end if;
  if k='density' and (jsonb_typeof(v) is distinct from 'string' or (e->>'value')not in ('comfortable','compact')) then return false; end if;
  if k='focus' and (jsonb_typeof(v) is distinct from 'string' or (e->>'value')not in ('latest','unread')) then return false; end if;
  if k in ('topics','tools','sections') then
   if jsonb_typeof(v) is distinct from 'array' then return false; end if;
   cap:=case k when 'topics' then 15 when 'tools' then 8 else 4 end;
   if jsonb_array_length(v)>cap or (select count(distinct value)from jsonb_array_elements(v))<>jsonb_array_length(v) then return false; end if;
   if k='sections' and jsonb_array_length(v)<>4 then return false; end if;
   for u in select jsonb_array_elements_text(v)loop
    if k='topics' and u not in ('tesla','tesla-software','fsd','robotaxi','roadster','optimus','production','starship','spacex','spacex-launches','starlink','grok','markets','x','promises') then return false; end if;
    if k='tools' and u not in ('starship','software','fsd','robotaxi','starlink','roadster','optimus','launches','mytesla','production','promises','explainers') then return false; end if;
    if k='sections' and u not in ('briefing','trackers','stories','reading')then return false;end if;
   end loop;
  end if;
 end loop;
 for k in select unnest(array['saved','read','hidden'])loop
  v:=d->k;
  if jsonb_typeof(v) is distinct from 'object' then return false; end if;
  cap:=case k when 'saved' then 100 when 'read' then 150 else 75 end;
  if(select count(*)from jsonb_object_keys(v))>cap then return false;end if;
  for u,e in select * from jsonb_each(v)loop
   if char_length(u)>180 or u!~'^/dispatch/[a-z0-9]+(-[a-z0-9]+)*[.]html$' or jsonb_typeof(e) is distinct from 'object'
    or (select count(*)from jsonb_object_keys(e))<>2 or jsonb_typeof(e->'value') is distinct from 'boolean'
    or jsonb_typeof(e->'at') is distinct from 'number' or (e->>'at')!~'^[0-9]{1,15}$'then return false;end if;
   if (e->>'at')::bigint>limit_at then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function sd_private.valid_personal_home(jsonb) from public,anon,authenticated;

create or replace function public.sd_personal_home()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null or not exists(select 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null)then raise exception 'sign_in_required';end if;
 select jsonb_build_object('document',h.document,'revision',h.revision)into result from sd_private.personal_homes h where h.user_id=uid;
 return coalesce(result,jsonb_build_object('document',null,'revision',0));
end $$;
create or replace function public.sd_save_personal_home(p_document jsonb,p_revision bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); current_revision bigint; next_revision bigint;
begin
 if uid is null or not exists(select 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null)then raise exception 'sign_in_required';end if;
 if p_revision is null or p_revision<0 or not sd_private.valid_personal_home(p_document)then raise exception 'invalid_document';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,240001));
 select h.revision into current_revision from sd_private.personal_homes h where h.user_id=uid;
 if coalesce(current_revision,0)<>p_revision then raise exception 'revision_conflict';end if;
 next_revision:=coalesce(current_revision,0)+1;
 insert into sd_private.personal_homes(user_id,document,revision)values(uid,p_document,next_revision)
 on conflict(user_id)do update set document=excluded.document,revision=excluded.revision,updated_at=clock_timestamp();
 return jsonb_build_object('document',p_document,'revision',next_revision);
end $$;
revoke all on function public.sd_personal_home(),public.sd_save_personal_home(jsonb,bigint) from public,anon;
grant execute on function public.sd_personal_home(),public.sd_save_personal_home(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
