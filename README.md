# Creami Lab

A calm recipe notebook for Ninja Creami experiments.

## Pages

- `/` is the homepage.
- `/recipes` is the recipe workspace.

## What It Stores

- Recipe name
- Version family, label, and notes
- Ingredients
- Instructions as editable lines, with manual numbering only when a line starts
  with a number and period, like `2.`
- Creami setting used
- Mix-ins
- Last made date
- Notes
- Before and after spin photos
- Tags like `mango`, `gelato`, `kulfi`, and `fudge swirl`
- Major and minor recipe categories
- Daily deterministic Creami of the Day
- Recipe version families like `Banana Fudge Swirl` with labels like `v1`,
  `v2`, or `Banana Split Edition`
- Visitor reviews with reviewer name, 1-5 stars, notes, review history,
  removable review entries, and per-recipe average ratings

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase env vars, the app runs in browser local-storage demo mode.
Those demo changes stay only in the current browser and are not shared with
other visitors.

## Supabase

Apply the migration in `supabase/migrations` to a Supabase project, then set:

```bash
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

The migrations create `public.recipes`, `public.recipe_reviews`, recipe category
tables, seeded default recipes, a public `creami-photos` storage bucket, and RLS
policies for anonymous family editing plus visitor review creation/removal. Add
Supabase Auth before using it for anything private or public-facing beyond a
trusted family notebook.

## Vercel

Add the same env vars to Vercel for Production, Preview, and Development.

```bash
npm run build
```
