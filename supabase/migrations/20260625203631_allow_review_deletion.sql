grant delete on public.recipe_reviews to anon, authenticated;

drop policy if exists "Visitors can delete reviews" on public.recipe_reviews;
create policy "Visitors can delete reviews"
on public.recipe_reviews
for delete
to anon, authenticated
using (true);
