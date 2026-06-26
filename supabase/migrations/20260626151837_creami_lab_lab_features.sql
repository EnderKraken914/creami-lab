alter table public.recipes add column if not exists description text not null default '';
alter table public.recipes add column if not exists prep_time text not null default '';
alter table public.recipes add column if not exists freeze_time text not null default '';
alter table public.recipes add column if not exists spin_setting text not null default '';
alter table public.recipes add column if not exists program_used text not null default '';
alter table public.recipes add column if not exists respin_count integer not null default 0 check (respin_count >= 0);
alter table public.recipes add column if not exists respin_liquid text not null default '';
alter table public.recipes add column if not exists respin_liquid_amount text not null default '';
alter table public.recipes add column if not exists respin_instructions text not null default '';
alter table public.recipes add column if not exists mix_in_amount text not null default '';
alter table public.recipes add column if not exists mix_in_timing text not null default '';
alter table public.recipes add column if not exists mix_in_instructions text not null default '';
alter table public.recipes add column if not exists serving_size text not null default '';
alter table public.recipes add column if not exists personal_rating smallint check (personal_rating between 1 and 5);
alter table public.recipes add column if not exists favorite boolean not null default false;
alter table public.recipes add column if not exists family_approved boolean not null default false;
alter table public.recipes add column if not exists version_number integer check (version_number is null or version_number > 0);
alter table public.recipes add column if not exists source_origin text not null default '';
alter table public.recipes add column if not exists difficulty text not null default '';
alter table public.recipes add column if not exists texture_result text not null default '';
alter table public.recipes add column if not exists sweetness_result text not null default '';
alter table public.recipes add column if not exists flavor_strength_result text not null default '';
alter table public.recipes add column if not exists spin_notes text not null default '';
alter table public.recipes add column if not exists would_make_again boolean not null default false;
alter table public.recipes add column if not exists tested boolean not null default false;
alter table public.recipes add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.recipes add column if not exists experiments jsonb not null default '[]'::jsonb;

alter table public.recipe_reviews add column if not exists would_eat_again boolean not null default false;

grant insert (
  id,
  created_at,
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
) on public.recipes to anon, authenticated;

grant update (
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
) on public.recipes to anon, authenticated;

create index if not exists recipes_favorite_idx
on public.recipes (favorite)
where favorite = true;

create index if not exists recipes_family_approved_idx
on public.recipes (family_approved)
where family_approved = true;

create table if not exists public.lab_standards (
  id text primary key default 'default',
  updated_at timestamptz not null default now(),
  rules text[] not null default '{}'
);

drop trigger if exists lab_standards_set_updated_at on public.lab_standards;
create trigger lab_standards_set_updated_at
before update on public.lab_standards
for each row execute function public.set_updated_at();

grant select, insert, update on public.lab_standards to anon, authenticated;

alter table public.lab_standards enable row level security;

drop policy if exists "Lab standards are readable" on public.lab_standards;
create policy "Lab standards are readable"
on public.lab_standards
for select
to anon, authenticated
using (true);

drop policy if exists "Lab standards can be created" on public.lab_standards;
create policy "Lab standards can be created"
on public.lab_standards
for insert
to anon, authenticated
with check (true);

drop policy if exists "Lab standards can be edited" on public.lab_standards;
create policy "Lab standards can be edited"
on public.lab_standards
for update
to anon, authenticated
using (true)
with check (true);

insert into public.lab_standards (id, rules)
values (
  'default',
  array[
    'Taste before freezing.',
    'Frozen desserts taste less sweet than the liquid base.',
    'Fruit bases should taste slightly stronger and sweeter before freezing.',
    'Standard xanthan gum amount: 1/4 tsp per pint unless testing otherwise.',
    'Use a pinch of salt to boost flavor.',
    'Chilled fudge works best for fudge streaks.',
    'Use Mix-In for ribbons/pockets, not perfect swirls.',
    'Label whether a recipe is tested or still experimental.'
  ]
)
on conflict (id) do nothing;

insert into public.recipes (
  id,
  slug,
  name,
  description,
  version_group,
  version_label,
  version_number,
  ingredients,
  instructions,
  creami_setting,
  prep_time,
  freeze_time,
  spin_setting,
  program_used,
  respin_count,
  mix_ins,
  family_rating,
  personal_rating,
  notes,
  tags,
  photo_before_url,
  photo_before_path,
  photo_after_url,
  photo_after_path,
  photos,
  built_in,
  last_made,
  minor_category_slug,
  serving_size,
  source_origin,
  favorite,
  family_approved,
  tested,
  would_make_again,
  experiments
)
values (
  'b7d003f2-8d29-4bf3-9fb7-7f3665404269',
  'peaches-and-cream-ice-cream',
  'Peaches and Cream Ice Cream',
  '',
  'Peaches and Cream',
  'v1',
  1,
  array[
    '3/4 cup + 1 tbsp heavy cream',
    '1 cup whole milk',
    '1 1/4 to 1 1/2 cups canned peaches, drained',
    '2 tbsp reserved peach juice',
    '3 tbsp sugar, adjust to taste',
    '1 tsp vanilla extract',
    'Pinch sea salt',
    '1/4 tsp xanthan gum'
  ],
  array[
    'Drain peaches and reserve 2 tbsp juice.',
    'Blend peaches, juice, cream, milk, sugar, vanilla, salt, and xanthan gum until smooth.',
    'Taste. It should taste like an amazing peach milkshake.',
    'Freeze for 18-24 hours.',
    'Run Ice Cream.',
    'Respin only if needed.'
  ],
  'Ice Cream, Respin if needed',
  '',
  '18-24 hours',
  'Ice Cream',
  'Ice Cream',
  1,
  '',
  null,
  null,
  '',
  array['peach', 'fruit', 'store-bought inspired', 'mom request'],
  null,
  null,
  null,
  null,
  '[]'::jsonb,
  true,
  null,
  'ice-cream',
  '1 pint',
  'Creami Lab built-in',
  false,
  false,
  false,
  false,
  '[]'::jsonb
)
on conflict (slug) do nothing;
