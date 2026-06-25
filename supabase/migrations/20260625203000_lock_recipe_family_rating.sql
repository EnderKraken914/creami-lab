revoke insert, update on public.recipes from anon, authenticated;

grant insert (
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
  minor_category_slug
) on public.recipes to anon, authenticated;

grant update (
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
  minor_category_slug
) on public.recipes to anon, authenticated;
