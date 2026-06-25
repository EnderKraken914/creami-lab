create table if not exists public.recipe_major_categories (
  slug text primary key,
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.recipe_minor_categories (
  slug text primary key,
  major_slug text not null references public.recipe_major_categories(slug) on update cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (major_slug, name)
);

grant select on public.recipe_major_categories, public.recipe_minor_categories to anon, authenticated;

alter table public.recipe_major_categories enable row level security;
alter table public.recipe_minor_categories enable row level security;

drop policy if exists "Major categories are readable" on public.recipe_major_categories;
create policy "Major categories are readable"
on public.recipe_major_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Minor categories are readable" on public.recipe_minor_categories;
create policy "Minor categories are readable"
on public.recipe_minor_categories
for select
to anon, authenticated
using (true);

insert into public.recipe_major_categories (slug, name, sort_order)
values
  ('scoop', 'Scoop', 10),
  ('soft-serve-swirl', 'Soft Serve / Swirl', 20)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.recipe_minor_categories (slug, major_slug, name, sort_order)
values
  ('ice-cream', 'scoop', 'Ice Cream', 10),
  ('gelato', 'scoop', 'Gelato', 20),
  ('kulfi', 'scoop', 'Kulfi', 30),
  ('sorbet', 'scoop', 'Sorbet', 40),
  ('sherbet', 'scoop', 'Sherbet', 50),
  ('italian-ice', 'scoop', 'Italian Ice', 60),
  ('frozen-yogurt', 'scoop', 'Frozen Yogurt', 70),
  ('frozen-custard', 'scoop', 'Frozen Custard', 80),
  ('lite-ice-cream', 'scoop', 'Lite Ice Cream', 90),
  ('creamifit', 'soft-serve-swirl', 'CreamiFit', 10),
  ('fruit-whip', 'soft-serve-swirl', 'Fruit Whip', 20),
  ('milkshake', 'soft-serve-swirl', 'Milkshake', 30)
on conflict (slug) do update
set major_slug = excluded.major_slug,
    name = excluded.name,
    sort_order = excluded.sort_order;

alter table public.recipes add column if not exists slug text;
alter table public.recipes add column if not exists built_in boolean not null default false;
alter table public.recipes add column if not exists last_made date;
alter table public.recipes add column if not exists minor_category_slug text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'ingredients'
      and data_type = 'text'
  ) then
    alter table public.recipes alter column ingredients drop default;
    alter table public.recipes
      alter column ingredients type text[]
      using case
        when ingredients is null or btrim(ingredients) = '' then '{}'::text[]
        else regexp_split_to_array(ingredients, E'\\r?\\n+')
      end;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'instructions'
      and data_type = 'text'
  ) then
    alter table public.recipes alter column instructions drop default;
    alter table public.recipes
      alter column instructions type text[]
      using case
        when instructions is null or btrim(instructions) = '' then '{}'::text[]
        else regexp_split_to_array(instructions, E'\\r?\\n+')
      end;
  end if;
end $$;

alter table public.recipes alter column ingredients set default '{}';
alter table public.recipes alter column ingredients set not null;
alter table public.recipes alter column instructions set default '{}';
alter table public.recipes alter column instructions set not null;
alter table public.recipes alter column family_rating drop default;
alter table public.recipes alter column family_rating drop not null;

update public.recipes
set family_rating = null
where family_rating is not null
  and (family_rating < 1 or family_rating > 5);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'recipes_family_rating_check'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes drop constraint recipes_family_rating_check;
  end if;

  alter table public.recipes
    add constraint recipes_family_rating_check
    check (family_rating between 1 and 5);
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_slug_key'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes add constraint recipes_slug_key unique (slug);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_minor_category_slug_fkey'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_minor_category_slug_fkey
      foreign key (minor_category_slug)
      references public.recipe_minor_categories(slug)
      on update cascade;
  end if;
end $$;

insert into public.recipes (
  id,
  slug,
  name,
  ingredients,
  instructions,
  creami_setting,
  mix_ins,
  family_rating,
  notes,
  tags,
  photo_before_url,
  photo_before_path,
  photo_after_url,
  photo_after_path,
  built_in,
  last_made,
  minor_category_slug
)
values
  (
    '0b7f3bc4-8c76-4e8f-9fd1-3fbf20f08f62',
    'banana-fudge-swirl-ice-cream',
    'Banana Fudge Swirl Ice Cream',
    array[
      '3/4 cup + 1 tbsp heavy cream',
      '1 cup whole milk',
      '1 large ripe banana',
      '1/4 cup sugar',
      '1 tsp vanilla extract',
      'Pinch sea salt',
      '1/8 tsp xanthan gum'
    ],
    array[
      'Blend all ingredients until smooth.',
      'Freeze for 18-24 hours.',
      'Run Ice Cream.',
      'If crumbly, add 1 tbsp milk and Respin.',
      'Add 4 tbsp chilled chocolate fudge.',
      'Run Mix-In.'
    ],
    'Ice Cream, Respin if needed, Mix-In',
    '4 tbsp chilled chocolate fudge',
    null,
    '',
    array['banana', 'fudge swirl', 'ice cream'],
    null,
    null,
    null,
    null,
    true,
    null,
    'ice-cream'
  ),
  (
    '7b32868f-eef7-4288-a036-8b0dd50e505a',
    'alphonso-mango-ice-cream',
    'Alphonso Mango Ice Cream',
    array[
      '3/4 cup + 1 tbsp heavy cream',
      '1 cup whole milk',
      '1 1/2 cups Alphonso mango',
      '4 tbsp sugar',
      'Pinch sea salt',
      '1/8 tsp xanthan gum'
    ],
    array[
      'Blend until smooth.',
      'Taste and adjust sweetness.',
      'Freeze for 18-24 hours.',
      'Run Ice Cream.',
      'Respin only if needed.'
    ],
    'Ice Cream, Respin if needed',
    '',
    null,
    '',
    array['alphonso mango', 'mango', 'ice cream'],
    null,
    null,
    null,
    null,
    true,
    null,
    'ice-cream'
  ),
  (
    '07bd6c0f-d460-44f0-bf21-8df85c0cdafd',
    'alphonso-mango-kulfi',
    'Alphonso Mango Kulfi',
    array[
      '1 cup whole milk',
      '1 cup heavy cream',
      '1 1/2 cups Alphonso mango',
      '4 tbsp sugar',
      '1/4 tsp ground cardamom',
      'Pinch sea salt',
      '1/8 tsp xanthan gum'
    ],
    array[
      'Blend until smooth.',
      'Taste and adjust.',
      'Freeze for 18-24 hours.',
      'Run Ice Cream.',
      'Optional: Mix in pistachios.'
    ],
    'Ice Cream, optional Mix-In',
    'Pistachios, optional',
    null,
    '',
    array['alphonso mango', 'mango', 'kulfi', 'cardamom'],
    null,
    null,
    null,
    null,
    true,
    null,
    'kulfi'
  ),
  (
    'ebf7503f-6ad0-45f2-99a8-99d6ade56af1',
    'triple-chocolate-gelato',
    'Triple Chocolate Gelato',
    array[
      '4 egg yolks',
      '1/3 cup dark brown sugar',
      '2 tbsp cocoa powder',
      '1 tbsp chocolate fudge topping',
      '3/4 cup heavy cream',
      '3/4 cup whole milk',
      '2 tbsp chopped chocolate chunks'
    ],
    array[
      'Whisk egg yolks and sugar.',
      'Add milk and cream.',
      'Cook until custard coats the back of a spoon.',
      'Stir in cocoa and fudge.',
      'Chill completely.',
      'Freeze for 24 hours.',
      'Run Gelato.',
      'Add chocolate chunks if not already incorporated.'
    ],
    'Gelato',
    '2 tbsp chopped chocolate chunks',
    null,
    '',
    array['chocolate', 'gelato', 'fudge'],
    null,
    null,
    null,
    null,
    true,
    null,
    'gelato'
  ),
  (
    '38019c9e-f9c1-4a44-8b4b-99cfc09d75d0',
    'strawberry-gelato',
    'Strawberry Gelato',
    array[
      '4 egg yolks',
      '1/3 cup dark brown sugar',
      '3/4 cup heavy cream',
      '3/4 cup whole milk',
      '1 1/4 cups strawberry puree',
      '1 tsp lemon juice',
      'Pinch sea salt',
      '1/8 tsp xanthan gum'
    ],
    array[
      'Blend strawberries.',
      'Make custard with yolks, sugar, milk and cream.',
      'Stir in strawberry puree.',
      'Add lemon juice, salt and xanthan gum.',
      'Chill completely.',
      'Freeze for 24 hours.',
      'Run Gelato.'
    ],
    'Gelato',
    '',
    null,
    '',
    array['strawberry', 'gelato'],
    null,
    null,
    null,
    null,
    true,
    null,
    'gelato'
  ),
  (
    'ad0da0e6-6516-451e-b9fa-736268b71ea5',
    'banana-gelato',
    'Banana Gelato',
    array[
      '4 egg yolks',
      '1/3 cup dark brown sugar',
      '3/4 cup heavy cream',
      '3/4 cup whole milk',
      '1 large ripe banana',
      '1 tsp vanilla extract',
      '1 tbsp chocolate fudge topping',
      'Pinch sea salt',
      '1/8 tsp xanthan gum'
    ],
    array[
      'Make custard.',
      'Blend custard with banana, vanilla, fudge, salt and xanthan gum.',
      'Chill.',
      'Freeze for 24 hours.',
      'Run Gelato.'
    ],
    'Gelato',
    '',
    null,
    '',
    array['banana', 'gelato', 'fudge'],
    null,
    null,
    null,
    null,
    true,
    null,
    'gelato'
  ),
  (
    '76d3e8ee-2c11-4de7-bdf7-2fe5f07b9da3',
    'marshmallow-ice-cream',
    'Marshmallow Ice Cream',
    array[
      '3/4 cup + 1 tbsp heavy cream',
      '1 cup whole milk',
      '1-1 1/4 cups halal marshmallows',
      '1/4 cup sugar',
      '1 tsp vanilla extract',
      'Pinch sea salt'
    ],
    array[
      'Heat the milk.',
      'Melt marshmallows completely.',
      'Stir in remaining ingredients.',
      'Cool.',
      'Freeze for 18-24 hours.',
      'Run Ice Cream.'
    ],
    'Ice Cream',
    '',
    null,
    '',
    array['marshmallow', 'ice cream'],
    null,
    null,
    null,
    null,
    true,
    null,
    'ice-cream'
  )
on conflict (slug) do update
set name = excluded.name,
    ingredients = excluded.ingredients,
    instructions = excluded.instructions,
    creami_setting = excluded.creami_setting,
    mix_ins = excluded.mix_ins,
    tags = excluded.tags,
    built_in = true,
    minor_category_slug = excluded.minor_category_slug;
