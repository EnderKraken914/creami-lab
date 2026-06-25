create table if not exists public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewer_name text not null check (char_length(trim(reviewer_name)) > 0),
  rating smallint not null check (rating between 1 and 5),
  notes text not null default ''
);

create index if not exists recipe_reviews_recipe_id_created_at_idx
on public.recipe_reviews (recipe_id, created_at desc);

grant select, insert on public.recipe_reviews to anon, authenticated;
grant select, insert, update, delete on public.recipe_reviews to service_role;

alter table public.recipe_reviews enable row level security;

drop policy if exists "Reviews are readable" on public.recipe_reviews;
create policy "Reviews are readable"
on public.recipe_reviews
for select
to anon, authenticated
using (true);

drop policy if exists "Visitors can create reviews" on public.recipe_reviews;
create policy "Visitors can create reviews"
on public.recipe_reviews
for insert
to anon, authenticated
with check (true);
