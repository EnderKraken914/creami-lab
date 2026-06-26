"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Calculator,
  ChefHat,
  Copy,
  Heart,
  ListChecks,
  Search,
  Shuffle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PINT_RULES } from "@/lib/rules";
import {
  DEFAULT_RECIPES,
  MAJOR_CATEGORIES,
  MINOR_CATEGORIES,
  getMajorForMinor,
  getMinorCategory,
  type MinorCategorySlug,
  type Recipe,
  type RecipeReview,
} from "@/lib/recipes";
import { getSupabaseClient } from "@/lib/supabase";

const LOCAL_STORAGE_KEY = "creami-lab-recipes-v2";
const LOCAL_STORAGE_REVIEWS_KEY = "creami-lab-reviews-v1";

type DashboardRecipe = Pick<
  Recipe,
  | "id"
  | "created_at"
  | "name"
  | "tags"
  | "minor_category_slug"
  | "last_made"
  | "favorite"
  | "family_approved"
  | "notes"
  | "version_label"
>;

function dashboardRecipe(raw: unknown): DashboardRecipe {
  const value = raw as Partial<Recipe>;

  return {
    id: String(value.id ?? crypto.randomUUID()),
    created_at: String(value.created_at ?? new Date().toISOString()),
    name: String(value.name ?? "Untitled pint"),
    tags: Array.isArray(value.tags) ? value.tags : [],
    minor_category_slug: getMinorCategory(value.minor_category_slug)
      ? (value.minor_category_slug as MinorCategorySlug)
      : null,
    last_made: value.last_made ?? null,
    favorite: Boolean(value.favorite),
    family_approved: Boolean(value.family_approved),
    notes: value.notes ?? "",
    version_label: value.version_label ?? null,
  };
}

function dashboardReview(raw: unknown): RecipeReview {
  const value = raw as Partial<RecipeReview>;

  return {
    id: String(value.id ?? crypto.randomUUID()),
    recipe_id: String(value.recipe_id ?? ""),
    created_at: String(value.created_at ?? new Date().toISOString()),
    reviewer_name: String(value.reviewer_name ?? "Anonymous"),
    rating: Number(value.rating ?? 0),
    notes: value.notes ?? "",
    would_eat_again: Boolean(value.would_eat_again),
  };
}

function categoryName(recipe: DashboardRecipe) {
  return getMinorCategory(recipe.minor_category_slug)?.name ?? "Uncategorized";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not made yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function averageForRecipe(reviews: RecipeReview[], recipeId: string) {
  const recipeReviews = reviews.filter((review) => review.recipe_id === recipeId);

  if (!recipeReviews.length) {
    return null;
  }

  return (
    recipeReviews.reduce((sum, review) => sum + review.rating, 0) /
    recipeReviews.length
  );
}

function mostUsedCategory(recipes: DashboardRecipe[]) {
  const counts = new Map<string, number>();
  recipes.forEach((recipe) => {
    const label = categoryName(recipe);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None"
  );
}

export default function HomeDashboard() {
  const [recipes, setRecipes] = useState<DashboardRecipe[]>([]);
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [randomRecipe, setRandomRecipe] = useState<DashboardRecipe | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      const supabase = getSupabaseClient();

      if (supabase) {
        const [{ data: recipeData }, { data: reviewData }] = await Promise.all([
          supabase.from("recipes").select("*").order("created_at", {
            ascending: false,
          }),
          supabase.from("recipe_reviews").select("*"),
        ]);
        setRecipes(((recipeData ?? []) as unknown[]).map(dashboardRecipe));
        setReviews(((reviewData ?? []) as unknown[]).map(dashboardReview));
        return;
      }

      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const storedReviews = window.localStorage.getItem(
        LOCAL_STORAGE_REVIEWS_KEY,
      );
      setRecipes(
        (stored ? (JSON.parse(stored) as unknown[]) : DEFAULT_RECIPES).map(
          dashboardRecipe,
        ),
      );
      setReviews(
        storedReviews
          ? (JSON.parse(storedReviews) as unknown[]).map(dashboardReview)
          : [],
      );
    }

    loadRecipes();
  }, []);

  const allTags = useMemo(
    () =>
      Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [recipes],
  );

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const recipeMajor = getMajorForMinor(recipe.minor_category_slug)?.slug;
      const searchable = [recipe.name, recipe.notes, recipe.tags.join(" ")]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (categoryFilter === "all" ||
          recipe.minor_category_slug === categoryFilter ||
          recipeMajor === categoryFilter) &&
        (tagFilter === "all" || recipe.tags.includes(tagFilter))
      );
    });
  }, [categoryFilter, query, recipes, tagFilter]);

  const recentlyAdded = [...recipes]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 4);
  const recentlyMade = recipes
    .filter((recipe) => recipe.last_made)
    .sort(
      (a, b) =>
        new Date(b.last_made ?? 0).getTime() -
        new Date(a.last_made ?? 0).getTime(),
    )
    .slice(0, 4);
  const favorites = recipes.filter((recipe) => recipe.favorite).slice(0, 4);
  const approved = recipes
    .filter((recipe) => recipe.family_approved)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--mint)]">
              <ChefHat size={21} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold">Creami Lab</span>
              <span className="block text-xs text-[var(--muted)]">
                Recipe notebook + experiment lab
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link className="nav-button" href="/recipes">
              <BookOpen size={16} aria-hidden="true" />
              Recipes
            </Link>
            <Link className="nav-button" href="/standards">
              <ListChecks size={16} aria-hidden="true" />
              Standards
            </Link>
            <Link className="nav-button" href="/converter">
              <Calculator size={16} aria-hidden="true" />
              Converter
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
              <p className="text-sm text-[var(--muted)]">Today in the lab</p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                Creami Lab
              </h1>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Total recipes" value={String(recipes.length)} />
                <Stat
                  label="Family approved"
                  value={String(recipes.filter((recipe) => recipe.family_approved).length)}
                />
                <Stat label="Most used category" value={mostUsedCategory(recipes)} />
                <Stat
                  label="Most recent recipe"
                  value={recentlyAdded[0]?.name ?? "None"}
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-[minmax(0,1fr)_180px_160px]">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
                <Search size={16} aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search recipes"
                  value={query}
                />
              </label>
              <select
                className="h-11 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">All categories</option>
                {MAJOR_CATEGORIES.map((major) => (
                  <option key={major.slug} value={major.slug}>
                    {major.name}
                  </option>
                ))}
                {MINOR_CATEGORIES.map((minor) => (
                  <option key={minor.slug} value={minor.slug}>
                    {minor.name}
                  </option>
                ))}
              </select>
              <select
                className="h-11 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setTagFilter(event.target.value)}
                value={tagFilter}
              >
                <option value="all">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <DashboardSection
              recipes={filteredRecipes.slice(0, 6)}
              reviews={reviews}
              title="Search results"
            />
            <DashboardSection
              recipes={recentlyAdded}
              reviews={reviews}
              title="Recently added"
            />
            <DashboardSection
              recipes={recentlyMade}
              reviews={reviews}
              title="Recently made"
            />
            <DashboardSection recipes={favorites} reviews={reviews} title="Favorites" />
            <DashboardSection
              recipes={approved}
              reviews={reviews}
              title="Family Approved"
            />
          </div>

          <aside className="space-y-4">
            <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-sm font-semibold text-[var(--mint)]">
                Quick actions
              </h2>
              <div className="mt-3 grid gap-2">
                <Link className="action-button bg-mint-action" href="/recipes">
                  <BookOpen size={16} aria-hidden="true" />
                  Create New Recipe
                </Link>
                <Link className="action-button" href="/recipes">
                  <Copy size={16} aria-hidden="true" />
                  Duplicate Recipe
                </Link>
                <button
                  className="action-button"
                  onClick={() =>
                    setRandomRecipe(
                      recipes[Math.floor(Math.random() * recipes.length)] ?? null,
                    )
                  }
                  type="button"
                >
                  <Shuffle size={16} aria-hidden="true" />
                  Random recipe
                </button>
              </div>
              {randomRecipe && (
                <div className="mt-3 rounded-md border border-[#28322d] bg-[#101411] p-3">
                  <p className="text-xs text-[var(--muted)]">Random pick</p>
                  <h3 className="mt-1 break-words text-sm font-semibold">
                    {randomRecipe.name}
                  </h3>
                  <Link
                    className="mt-3 inline-flex h-9 items-center rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
                    href="/recipes"
                  >
                    Open recipes
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-sm font-semibold text-[var(--mint)]">
                Our Rules
              </h2>
              <ol className="mt-3 space-y-2">
                {PINT_RULES.map((rule, index) => (
                  <li className="flex gap-2 text-sm" key={rule}>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#4b5136] text-[10px] text-[var(--amber)]">
                      {index + 1}
                    </span>
                    <span className="break-words text-[var(--muted)]">
                      {rule}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#28322d] bg-[#101411] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function DashboardSection({
  recipes,
  reviews,
  title,
}: {
  recipes: DashboardRecipe[];
  reviews: RecipeReview[];
  title: string;
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="text-sm font-semibold text-[var(--mint)]">{title}</h2>
      {recipes.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {recipes.map((recipe) => (
            <Link
              className="min-w-0 rounded-md border border-[#28322d] bg-[#101411] p-3 transition hover:border-[var(--mint)]"
              href="/recipes"
              key={recipe.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{recipe.name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {categoryName(recipe)} - Last made {formatDate(recipe.last_made)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--amber)]">
                  {averageForRecipe(reviews, recipe.id)?.toFixed(1) ?? "No rating"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.favorite && <TinyBadge icon={<Heart size={11} />} text="Favorite" />}
                {recipe.family_approved && (
                  <TinyBadge icon={<BadgeCheck size={11} />} text="Family" />
                )}
                {recipe.tags.slice(0, 3).map((tag) => (
                  <TinyBadge key={tag} text={tag} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-[#28322d] bg-[#101411] p-3 text-sm text-[var(--muted)]">
          Nothing here yet.
        </p>
      )}
    </section>
  );
}

function TinyBadge({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#3b463f] px-2 py-1 text-[11px] text-[var(--muted)]">
      {icon}
      <span className="truncate">{text}</span>
    </span>
  );
}
