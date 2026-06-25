alter table public.recipes add column if not exists version_group text;
alter table public.recipes add column if not exists version_label text;
alter table public.recipes add column if not exists version_notes text not null default '';

create index if not exists recipes_version_group_idx
on public.recipes (lower(version_group))
where version_group is not null;

update public.recipes
set version_group = 'Banana Fudge Swirl',
    version_label = 'v1',
    version_notes = ''
where slug = 'banana-fudge-swirl-ice-cream';

update public.recipes
set version_group = 'Alphonso Mango',
    version_label = 'Ice Cream',
    version_notes = ''
where slug = 'alphonso-mango-ice-cream';

update public.recipes
set version_group = 'Alphonso Mango',
    version_label = 'Kulfi',
    version_notes = ''
where slug = 'alphonso-mango-kulfi';

update public.recipes
set version_group = 'Chocolate',
    version_label = 'Triple Chocolate Gelato',
    version_notes = ''
where slug = 'triple-chocolate-gelato';

update public.recipes
set version_group = 'Strawberry',
    version_label = 'Gelato',
    version_notes = ''
where slug = 'strawberry-gelato';

update public.recipes
set version_group = 'Banana',
    version_label = 'Gelato',
    version_notes = ''
where slug = 'banana-gelato';

update public.recipes
set version_group = 'Marshmallow',
    version_label = 'Ice Cream',
    version_notes = ''
where slug = 'marshmallow-ice-cream';
