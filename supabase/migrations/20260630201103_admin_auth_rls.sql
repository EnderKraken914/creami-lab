begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    or ((select auth.jwt()) -> 'app_metadata' ->> 'is_admin') = 'true'
    or (((select auth.jwt()) -> 'app_metadata' -> 'roles') ? 'admin'),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.recipes enable row level security;
alter table public.recipe_reviews enable row level security;
alter table public.lab_standards enable row level security;

revoke all privileges on table public.recipes from anon, authenticated;
revoke all privileges on table public.recipe_reviews from anon, authenticated;
revoke all privileges on table public.lab_standards from anon, authenticated;

revoke insert (
  id,
  created_at,
  name,
  version_group,
  version_label,
  version_notes,
  ingredients,
  instructions,
  creami_setting,
  mix_ins,
  notes,
  tags,
  photo_before_url,
  photo_before_path,
  photo_after_url,
  photo_after_path,
  slug,
  built_in,
  last_made,
  minor_category_slug,
  description,
  prep_time,
  freeze_time,
  spin_setting,
  program_used,
  respin_count,
  respin_liquid,
  respin_liquid_amount,
  respin_instructions,
  mix_in_amount,
  mix_in_timing,
  mix_in_instructions,
  serving_size,
  personal_rating,
  favorite,
  family_approved,
  version_number,
  source_origin,
  difficulty,
  texture_result,
  sweetness_result,
  flavor_strength_result,
  spin_notes,
  would_make_again,
  tested,
  photos,
  experiments
) on table public.recipes from anon, authenticated;

revoke update (
  name,
  version_group,
  version_label,
  version_notes,
  ingredients,
  instructions,
  creami_setting,
  mix_ins,
  notes,
  tags,
  photo_before_url,
  photo_before_path,
  photo_after_url,
  photo_after_path,
  slug,
  built_in,
  last_made,
  minor_category_slug,
  description,
  prep_time,
  freeze_time,
  spin_setting,
  program_used,
  respin_count,
  respin_liquid,
  respin_liquid_amount,
  respin_instructions,
  mix_in_amount,
  mix_in_timing,
  mix_in_instructions,
  serving_size,
  personal_rating,
  favorite,
  family_approved,
  version_number,
  source_origin,
  difficulty,
  texture_result,
  sweetness_result,
  flavor_strength_result,
  spin_notes,
  would_make_again,
  tested,
  photos,
  experiments
) on table public.recipes from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on table public.recipes to anon, authenticated;
grant insert, update, delete on table public.recipes to authenticated;

grant select, delete on table public.recipe_reviews to anon, authenticated;
grant insert (
  recipe_id,
  reviewer_name,
  rating,
  notes,
  would_eat_again
) on table public.recipe_reviews to anon, authenticated;
grant update (
  reviewer_name,
  rating,
  notes,
  would_eat_again
) on table public.recipe_reviews to anon, authenticated;

grant select on table public.lab_standards to anon, authenticated;
grant insert, update, delete on table public.lab_standards to authenticated;

drop policy if exists "Recipes are readable" on public.recipes;
drop policy if exists "Recipes can be created" on public.recipes;
drop policy if exists "Recipes can be edited" on public.recipes;
drop policy if exists "Recipes can be deleted" on public.recipes;
drop policy if exists "Public can read recipes" on public.recipes;
drop policy if exists "Admins can create recipes" on public.recipes;
drop policy if exists "Admins can edit recipes" on public.recipes;
drop policy if exists "Admins can delete recipes" on public.recipes;

create policy "Public can read recipes"
on public.recipes
for select
to anon, authenticated
using (true);

create policy "Admins can create recipes"
on public.recipes
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can edit recipes"
on public.recipes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete recipes"
on public.recipes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Reviews are readable" on public.recipe_reviews;
drop policy if exists "Visitors can create reviews" on public.recipe_reviews;
drop policy if exists "Visitors can delete reviews" on public.recipe_reviews;
drop policy if exists "Public can read reviews" on public.recipe_reviews;
drop policy if exists "Public can create reviews" on public.recipe_reviews;
drop policy if exists "Public can change reviews" on public.recipe_reviews;
drop policy if exists "Public can delete reviews" on public.recipe_reviews;

create policy "Public can read reviews"
on public.recipe_reviews
for select
to anon, authenticated
using (true);

create policy "Public can create reviews"
on public.recipe_reviews
for insert
to anon, authenticated
with check (
  recipe_id is not null
  and exists (
    select 1
    from public.recipes
    where public.recipes.id = recipe_id
  )
  and char_length(btrim(reviewer_name)) between 1 and 80
  and rating between 1 and 5
  and char_length(coalesce(notes, '')) <= 2000
);

create policy "Public can change reviews"
on public.recipe_reviews
for update
to anon, authenticated
using (recipe_id is not null)
with check (
  recipe_id is not null
  and exists (
    select 1
    from public.recipes
    where public.recipes.id = recipe_id
  )
  and char_length(btrim(reviewer_name)) between 1 and 80
  and rating between 1 and 5
  and char_length(coalesce(notes, '')) <= 2000
);

create policy "Public can delete reviews"
on public.recipe_reviews
for delete
to anon, authenticated
using (recipe_id is not null);

drop policy if exists "Lab standards are readable" on public.lab_standards;
drop policy if exists "Lab standards can be created" on public.lab_standards;
drop policy if exists "Lab standards can be edited" on public.lab_standards;
drop policy if exists "Public can read lab standards" on public.lab_standards;
drop policy if exists "Admins can create lab standards" on public.lab_standards;
drop policy if exists "Admins can edit lab standards" on public.lab_standards;
drop policy if exists "Admins can delete lab standards" on public.lab_standards;

create policy "Public can read lab standards"
on public.lab_standards
for select
to anon, authenticated
using (true);

create policy "Admins can create lab standards"
on public.lab_standards
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can edit lab standards"
on public.lab_standards
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete lab standards"
on public.lab_standards
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Creami photos are readable" on storage.objects;
drop policy if exists "Creami photos can be uploaded" on storage.objects;
drop policy if exists "Creami photos can be replaced" on storage.objects;
drop policy if exists "Creami photos can be deleted" on storage.objects;
drop policy if exists "Public can read creami photos" on storage.objects;
drop policy if exists "Admins can upload creami photos" on storage.objects;
drop policy if exists "Admins can replace creami photos" on storage.objects;
drop policy if exists "Admins can delete creami photos" on storage.objects;

create policy "Admins can upload creami photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'creami-photos' and public.is_admin());

create policy "Admins can replace creami photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'creami-photos' and public.is_admin())
with check (bucket_id = 'creami-photos' and public.is_admin());

create policy "Admins can delete creami photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'creami-photos' and public.is_admin());

commit;
