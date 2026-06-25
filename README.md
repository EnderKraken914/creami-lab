# Creami Lab

A calm recipe notebook for Ninja Creami experiments.

## What It Stores

- Recipe name
- Ingredients
- Instructions
- Creami setting used
- Mix-ins
- Rating from family
- Notes
- Before and after spin photos
- Tags like `mango`, `gelato`, `kulfi`, and `fudge swirl`

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

The migration creates `public.recipes`, a public `creami-photos` storage bucket,
and RLS policies for anonymous family editing. Add Supabase Auth before using it
for anything private or public-facing beyond a trusted family notebook.

## Vercel

Add the same env vars to Vercel for Production, Preview, and Development.

```bash
npm run build
```
