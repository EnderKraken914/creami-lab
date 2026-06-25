create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(trim(name)) > 0),
  ingredients text[] not null default '{}',
  instructions text[] not null default '{}',
  creami_setting text not null default '',
  mix_ins text not null default '',
  family_rating smallint check (family_rating between 1 and 5),
  notes text not null default '',
  tags text[] not null default '{}',
  photo_before_url text,
  photo_before_path text,
  photo_after_url text,
  photo_after_path text,
  slug text unique,
  built_in boolean not null default false,
  last_made date,
  minor_category_slug text
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.recipes to anon, authenticated;

alter table public.recipes enable row level security;

drop policy if exists "Recipes are readable" on public.recipes;
create policy "Recipes are readable"
on public.recipes
for select
to anon, authenticated
using (true);

drop policy if exists "Recipes can be created" on public.recipes;
create policy "Recipes can be created"
on public.recipes
for insert
to anon, authenticated
with check (true);

drop policy if exists "Recipes can be edited" on public.recipes;
create policy "Recipes can be edited"
on public.recipes
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Recipes can be deleted" on public.recipes;
create policy "Recipes can be deleted"
on public.recipes
for delete
to anon, authenticated
using (true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'creami-photos',
  'creami-photos',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Creami photos are readable" on storage.objects;
create policy "Creami photos are readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'creami-photos');

drop policy if exists "Creami photos can be uploaded" on storage.objects;
create policy "Creami photos can be uploaded"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'creami-photos');

drop policy if exists "Creami photos can be replaced" on storage.objects;
create policy "Creami photos can be replaced"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'creami-photos')
with check (bucket_id = 'creami-photos');

drop policy if exists "Creami photos can be deleted" on storage.objects;
create policy "Creami photos can be deleted"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'creami-photos');
