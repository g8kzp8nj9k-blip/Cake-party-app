-- Cake Party — run this whole file in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it drops and recreates.

drop table if exists answers cascade;
drop table if exists cakes cascade;

create table answers (
  guest_id   text primary key,
  name       text not null,
  responses  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cakes (
  guest_id     text primary key,
  name         text not null,
  cake_url     text not null,
  decor_url    text,
  ai_ideas     text,
  ai_roast     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on answers (updated_at desc);
create index on cakes (updated_at desc);

-- This is a private party link, so everyone may read and write.
alter table answers enable row level security;
alter table cakes   enable row level security;

create policy "party guests read answers"  on answers for select using (true);
create policy "party guests write answers" on answers for insert with check (true);
create policy "party guests edit answers"  on answers for update using (true) with check (true);

create policy "party guests read cakes"  on cakes for select using (true);
create policy "party guests write cakes" on cakes for insert with check (true);
create policy "party guests edit cakes"  on cakes for update using (true) with check (true);

-- Photo storage
insert into storage.buckets (id, name, public)
values ('cakes', 'cakes', true)
on conflict (id) do update set public = true;

drop policy if exists "cake photos readable"   on storage.objects;
drop policy if exists "cake photos uploadable" on storage.objects;
drop policy if exists "cake photos updatable"  on storage.objects;

create policy "cake photos readable"   on storage.objects for select using (bucket_id = 'cakes');
create policy "cake photos uploadable" on storage.objects for insert with check (bucket_id = 'cakes');
create policy "cake photos updatable"  on storage.objects for update using (bucket_id = 'cakes');
