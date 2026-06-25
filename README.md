# Creami Lab

A calm recipe notebook for Ninja Creami experiments.

## What It Stores

- Recipe name
- Version family, label, and notes
- Ingredients
- Instructions as ordered steps
- Creami setting used
- Mix-ins
- Rating from family
- Last made date
- Notes
- Before and after spin photos
- Tags like `mango`, `gelato`, `kulfi`, and `fudge swirl`
- Built-in default recipe marker
- Major and minor recipe categories
- Daily deterministic Creami of the Day
- 1-5 star family ratings
- Recipe version families like `Banana Fudge Swirl` with labels like `v1`,
  `v2`, or `Banana Split Edition`

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase env vars, the app runs in browser local-storage demo mode.

## Supabase

Apply the migration in `supabase/migrations` to a Supabase project, then set:

```bash
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

The migrations create `public.recipes`, recipe category tables, seeded built-in
recipes, a public `creami-photos` storage bucket, and RLS policies for anonymous
family editing. Add Supabase Auth before using it for anything private or
public-facing beyond a trusted family notebook.

## Vercel

Add the same env vars to Vercel for Production, Preview, and Development.

```bash
npm run build
```
