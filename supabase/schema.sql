-- Applied to the Supabase project "placeholder" (ap-south-1) on 7 Nov 2026.
-- Kept here as a record of what the cloud looks like.

create table public.places (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo', 'pin')),
  title text not null default '',
  note text not null default '',
  tags text[] not null default '{}',
  lat double precision,
  lng double precision,
  accuracy integer,
  area text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index places_user_updated_idx on public.places (user_id, updated_at);
alter table public.places enable row level security;
create policy "Owner can read places" on public.places for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add places" on public.places for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change places" on public.places for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete places" on public.places for delete to authenticated using ((select auth.uid()) = user_id);

-- Private photo folder: photos/<user id>/<place id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg']);
create policy "Owner can read photos" on storage.objects for select to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner can upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner can replace photos" on storage.objects for update to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owner can delete photos" on storage.objects for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
