"use client";

import {
  Camera,
  Check,
  ChefHat,
  Edit3,
  ImagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient, PHOTO_BUCKET } from "@/lib/supabase";
import {
  DEFAULT_RECIPES,
  MAJOR_CATEGORIES,
  MINOR_CATEGORIES,
  getMajorForMinor,
  getMinorCategory,
  type MinorCategorySlug,
  type Recipe,
} from "@/lib/recipes";

type RecipeForm = {
  id?: string;
  slug?: string | null;
  name: string;
  version_group: string;
  version_label: string;
  version_notes: string;
  ingredientsText: string;
  instructionsText: string;
  creami_setting: string;
  mix_ins: string;
  family_rating: string;
  notes: string;
  tagsText: string;
  photo_before_url: string;
  photo_before_path: string;
  photo_after_url: string;
  photo_after_path: string;
  built_in: boolean;
  last_made: string;
  minor_category_slug: MinorCategorySlug | "";
};

const LOCAL_STORAGE_KEY = "creami-lab-recipes-v2";
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

const emptyForm: RecipeForm = {
  name: "",
  version_group: "",
  version_label: "",
  version_notes: "",
  ingredientsText: "",
  instructionsText: "",
  creami_setting: "",
  mix_ins: "",
  family_rating: "",
  notes: "",
  tagsText: "",
  photo_before_url: "",
  photo_before_path: "",
  photo_after_url: "",
  photo_after_path: "",
  built_in: false,
  last_made: "",
  minor_category_slug: "ice-cream",
};

const now = () => new Date().toISOString();

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeTags(tagsText: string) {
  return tagsText
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

function normalizeTextList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return splitLines(value);
  }

  return [];
}

function normalizeRating(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  const normalized = Math.trunc(parsed);
  return Number.isFinite(normalized) && normalized >= 1 && normalized <= 5
    ? normalized
    : null;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeVersionKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function stripVersionSuffix(name: string) {
  return name
    .replace(/\s+v\d+\b.*$/i, "")
    .replace(/\s+\([^)]*\)\s*$/i, "")
    .trim();
}

function versionFamilyName(recipe: Recipe) {
  return recipe.version_group?.trim() || stripVersionSuffix(recipe.name);
}

function versionSummary(recipe: Recipe) {
  const label = recipe.version_label?.trim();
  const notes = recipe.version_notes.trim();

  if (!label && !notes) {
    return "No version label";
  }

  if (label && notes) {
    return `${label} (${notes})`;
  }

  return label || notes;
}

function nextVersionLabel(recipe: Recipe, recipes: Recipe[]) {
  const family = versionFamilyName(recipe);
  const familyKey = normalizeVersionKey(family);
  const maxVersion = recipes.reduce((max, item) => {
    const itemFamily = versionFamilyName(item);
    const itemFamilyKey = normalizeVersionKey(item.version_group || itemFamily);

    if (itemFamilyKey !== familyKey) {
      return max;
    }

    const match = (item.version_label || item.name).match(/\bv(\d+)\b/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `v${maxVersion + 1}`;
}

function normalizeRecipe(raw: unknown): Recipe {
  const value = raw as Record<string, unknown>;
  const fallback = DEFAULT_RECIPES.find(
    (recipe) => recipe.slug && recipe.slug === value.slug,
  );

  return {
    id: String(value.id ?? fallback?.id ?? crypto.randomUUID()),
    slug:
      typeof value.slug === "string" && value.slug.length
        ? value.slug
        : fallback?.slug ?? null,
    created_at: String(value.created_at ?? fallback?.created_at ?? now()),
    updated_at: String(value.updated_at ?? fallback?.updated_at ?? now()),
    name: String(value.name ?? fallback?.name ?? "Untitled pint"),
    version_group: normalizeOptionalText(
      value.version_group ?? fallback?.version_group,
    ),
    version_label: normalizeOptionalText(
      value.version_label ?? fallback?.version_label,
    ),
    version_notes: String(value.version_notes ?? fallback?.version_notes ?? ""),
    ingredients: normalizeTextList(value.ingredients ?? fallback?.ingredients),
    instructions: normalizeTextList(
      value.instructions ?? fallback?.instructions,
    ),
    creami_setting: String(
      value.creami_setting ?? fallback?.creami_setting ?? "",
    ),
    mix_ins: String(value.mix_ins ?? fallback?.mix_ins ?? ""),
    family_rating: normalizeRating(
      value.family_rating ?? fallback?.family_rating,
    ),
    notes: String(value.notes ?? fallback?.notes ?? ""),
    tags: Array.isArray(value.tags)
      ? value.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : fallback?.tags ?? [],
    photo_before_url:
      typeof value.photo_before_url === "string"
        ? value.photo_before_url
        : fallback?.photo_before_url ?? null,
    photo_before_path:
      typeof value.photo_before_path === "string"
        ? value.photo_before_path
        : fallback?.photo_before_path ?? null,
    photo_after_url:
      typeof value.photo_after_url === "string"
        ? value.photo_after_url
        : fallback?.photo_after_url ?? null,
    photo_after_path:
      typeof value.photo_after_path === "string"
        ? value.photo_after_path
        : fallback?.photo_after_path ?? null,
    built_in: Boolean(value.built_in ?? fallback?.built_in ?? false),
    last_made:
      typeof value.last_made === "string" && value.last_made.length
        ? value.last_made
        : null,
    minor_category_slug: getMinorCategory(String(value.minor_category_slug))
      ? (String(value.minor_category_slug) as MinorCategorySlug)
      : fallback?.minor_category_slug ?? null,
  };
}

function mergeBuiltInRecipes(recipes: Recipe[]) {
  const slugs = new Set(recipes.map((recipe) => recipe.slug).filter(Boolean));
  const missingBuiltIns = DEFAULT_RECIPES.filter(
    (recipe) => recipe.slug && !slugs.has(recipe.slug),
  );

  return [...recipes, ...missingBuiltIns];
}

function sortRecipes(recipes: Recipe[]) {
  return [...recipes].sort((a, b) => {
    if (a.built_in !== b.built_in) {
      return a.built_in ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function toForm(recipe: Recipe): RecipeForm {
  return {
    id: recipe.id,
    slug: recipe.slug,
    name: recipe.name,
    version_group: recipe.version_group ?? "",
    version_label: recipe.version_label ?? "",
    version_notes: recipe.version_notes,
    ingredientsText: recipe.ingredients.join("\n"),
    instructionsText: recipe.instructions.join("\n"),
    creami_setting: recipe.creami_setting,
    mix_ins: recipe.mix_ins,
    family_rating:
      recipe.family_rating === null ? "" : String(recipe.family_rating),
    notes: recipe.notes,
    tagsText: recipe.tags.join(", "),
    photo_before_url: recipe.photo_before_url ?? "",
    photo_before_path: recipe.photo_before_path ?? "",
    photo_after_url: recipe.photo_after_url ?? "",
    photo_after_path: recipe.photo_after_path ?? "",
    built_in: recipe.built_in,
    last_made: recipe.last_made ?? "",
    minor_category_slug: recipe.minor_category_slug ?? "",
  };
}

function formToPayload(form: RecipeForm) {
  return {
    slug: form.slug ?? null,
    name: form.name.trim() || "Untitled pint",
    version_group: form.version_group.trim() || null,
    version_label: form.version_label.trim() || null,
    version_notes: form.version_notes.trim(),
    ingredients: splitLines(form.ingredientsText),
    instructions: splitLines(form.instructionsText),
    creami_setting: form.creami_setting.trim(),
    mix_ins: form.mix_ins.trim(),
    family_rating:
      form.family_rating === "" ? null : Number(form.family_rating),
    notes: form.notes.trim(),
    tags: normalizeTags(form.tagsText),
    photo_before_url: form.photo_before_url.trim() || null,
    photo_before_path: form.photo_before_path.trim() || null,
    photo_after_url: form.photo_after_url.trim() || null,
    photo_after_path: form.photo_after_path.trim() || null,
    built_in: form.built_in,
    last_made: form.last_made || null,
    minor_category_slug: form.minor_category_slug || null,
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  return value ? formatDate(value) : "Not made yet";
}

function getLocalDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getCreamiOfTheDay(recipes: Recipe[]) {
  if (!recipes.length) {
    return null;
  }

  return recipes[hashString(getLocalDateKey()) % recipes.length];
}

function categoryText(recipe: Recipe) {
  const minor = getMinorCategory(recipe.minor_category_slug);
  const major = getMajorForMinor(recipe.minor_category_slug);

  if (!minor || !major) {
    return "Uncategorized";
  }

  return `${major.name} / ${minor.name}`;
}

export default function Home() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<RecipeForm | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const sortedRecipes = useMemo(() => sortRecipes(recipes), [recipes]);
  const selectedRecipe =
    sortedRecipes.find((recipe) => recipe.id === selectedId) ??
    sortedRecipes[0] ??
    null;
  const creamiOfTheDay = useMemo(
    () => getCreamiOfTheDay(sortedRecipes),
    [sortedRecipes],
  );
  const selectedVersionRecipes = useMemo(() => {
    if (!selectedRecipe) {
      return [];
    }

    const family = versionFamilyName(selectedRecipe);
    const familyKey = normalizeVersionKey(family);

    if (!familyKey) {
      return [];
    }

    return sortRecipes(
      recipes.filter(
        (recipe) =>
          normalizeVersionKey(recipe.version_group || versionFamilyName(recipe)) ===
          familyKey,
      ),
    );
  }, [recipes, selectedRecipe]);
  const versionSetCount = new Set(
    recipes
      .map((recipe) => normalizeVersionKey(recipe.version_group))
      .filter(Boolean),
  ).size;

  const allTags = useMemo(
    () =>
      Array.from(new Set(recipes.flatMap((recipe) => recipe.tags))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [recipes],
  );

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortRecipes(
      recipes.filter((recipe) => {
        const searchable = [
          recipe.name,
          recipe.ingredients.join(" "),
          recipe.instructions.join(" "),
          recipe.creami_setting,
          recipe.mix_ins,
          recipe.notes,
          recipe.version_group,
          recipe.version_label,
          recipe.version_notes,
          recipe.tags.join(" "),
          categoryText(recipe),
        ]
          .join(" ")
          .toLowerCase();
        const matchesQuery =
          !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesTag =
          tagFilter === "all" || recipe.tags.includes(tagFilter);
        const matchesCategory =
          categoryFilter === "all" ||
          recipe.minor_category_slug === categoryFilter;

        return matchesQuery && matchesTag && matchesCategory;
      }),
    );
  }, [categoryFilter, query, recipes, tagFilter]);

  const ratedRecipes = recipes.filter(
    (recipe): recipe is Recipe & { family_rating: number } =>
      recipe.family_rating !== null,
  );
  const averageRating = ratedRecipes.length
    ? ratedRecipes.reduce((sum, recipe) => sum + recipe.family_rating, 0) /
      ratedRecipes.length
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      setIsLoading(true);
      setError("");

      if (!supabase) {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        const localRecipes = stored
          ? mergeBuiltInRecipes((JSON.parse(stored) as unknown[]).map(normalizeRecipe))
          : DEFAULT_RECIPES;
        const sortedLocalRecipes = sortRecipes(localRecipes);

        if (isMounted) {
          setRecipes(sortedLocalRecipes);
          setSelectedId(sortedLocalRecipes[0]?.id ?? "");
          setIsLoading(false);
        }

        return;
      }

      const { data, error: loadError } = await supabase
        .from("recipes")
        .select("*")
        .order("built_in", { ascending: false })
        .order("name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setRecipes([]);
      } else {
        const remoteRecipes = mergeBuiltInRecipes(
          ((data ?? []) as unknown[]).map(normalizeRecipe),
        );
        const sortedRemoteRecipes = sortRecipes(remoteRecipes);
        setRecipes(sortedRemoteRecipes);
        setSelectedId(sortedRemoteRecipes[0]?.id ?? "");
      }

      setIsLoading(false);
    }

    loadRecipes();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase && recipes.length) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recipes));
    }
  }, [recipes, supabase]);

  function startNewRecipe() {
    setEditing({
      ...emptyForm,
      name: "New Creami Pint",
      tagsText: "",
    });
    setNotice("");
  }

  function startEditing(recipe: Recipe | null) {
    if (!recipe) {
      startNewRecipe();
      return;
    }

    setEditing(toForm(recipe));
    setNotice("");
  }

  function startNewVersion(recipe: Recipe | null) {
    if (!recipe) {
      startNewRecipe();
      return;
    }

    const family = versionFamilyName(recipe);

    setEditing({
      ...toForm(recipe),
      id: undefined,
      slug: null,
      built_in: false,
      family_rating: "",
      last_made: "",
      notes: "",
      photo_after_path: "",
      photo_after_url: "",
      photo_before_path: "",
      photo_before_url: "",
      version_group: family,
      version_label: nextVersionLabel(recipe, recipes),
      version_notes: "",
    });
    setNotice("");
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    setBusy("recipe");
    setError("");
    setNotice("");

    const payload = formToPayload(editing);

    if (!supabase) {
      const savedRecipe: Recipe = {
        id: editing.id ?? crypto.randomUUID(),
        created_at:
          recipes.find((recipe) => recipe.id === editing.id)?.created_at ??
          now(),
        updated_at: now(),
        ...payload,
      };

      setRecipes((current) => {
        const exists = current.some((recipe) => recipe.id === savedRecipe.id);
        return sortRecipes(
          exists
            ? current.map((recipe) =>
                recipe.id === savedRecipe.id ? savedRecipe : recipe,
              )
            : [savedRecipe, ...current],
        );
      });
      setSelectedId(savedRecipe.id);
      setEditing(null);
      setNotice("Recipe saved locally.");
      setBusy("");
      return;
    }

    const request = editing.id
      ? supabase
          .from("recipes")
          .update(payload)
          .eq("id", editing.id)
          .select("*")
          .single()
      : supabase.from("recipes").insert(payload).select("*").single();

    const { data, error: saveError } = await request;

    if (saveError) {
      setError(saveError.message);
      setBusy("");
      return;
    }

    const savedRecipe = normalizeRecipe(data);
    setRecipes((current) => {
      const exists = current.some((recipe) => recipe.id === savedRecipe.id);
      return sortRecipes(
        exists
          ? current.map((recipe) =>
              recipe.id === savedRecipe.id ? savedRecipe : recipe,
            )
          : [savedRecipe, ...current],
      );
    });
    setSelectedId(savedRecipe.id);
    setEditing(null);
    setNotice("Recipe saved.");
    setBusy("");
  }

  async function updateRecipeFields(
    recipeId: string,
    fields: Partial<Recipe>,
    successMessage: string,
  ) {
    setBusy(recipeId);
    setError("");
    setNotice("");

    if (!supabase) {
      setRecipes((current) =>
        sortRecipes(
          current.map((recipe) =>
            recipe.id === recipeId
              ? { ...recipe, ...fields, updated_at: now() }
              : recipe,
          ),
        ),
      );
      setNotice(successMessage);
      setBusy("");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("recipes")
      .update(fields)
      .eq("id", recipeId)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      setBusy("");
      return;
    }

    const updatedRecipe = normalizeRecipe(data);
    setRecipes((current) =>
      sortRecipes(
        current.map((recipe) =>
          recipe.id === updatedRecipe.id ? updatedRecipe : recipe,
        ),
      ),
    );
    setNotice(successMessage);
    setBusy("");
  }

  async function uploadPhoto(
    recipe: Recipe | null,
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!recipe || !file) {
      return;
    }

    setBusy(`${recipe.id}-${stage}`);
    setError("");
    setNotice("");

    let publicUrl = "";
    let path: string | null = null;

    try {
      if (supabase) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        path = `${recipe.id}/${stage}-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        publicUrl = await fileToDataUrl(file);
      }

      await updateRecipeFields(
        recipe.id,
        {
          [`photo_${stage}_url`]: publicUrl,
          [`photo_${stage}_path`]: path,
        } as Partial<Recipe>,
        `${stage === "before" ? "Before" : "After"} photo saved.`,
      );
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Photo upload failed.",
      );
      setBusy("");
    }
  }

  async function removePhoto(recipe: Recipe | null, stage: "before" | "after") {
    if (!recipe) {
      return;
    }

    const path =
      stage === "before" ? recipe.photo_before_path : recipe.photo_after_path;

    if (supabase && path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    }

    await updateRecipeFields(
      recipe.id,
      {
        [`photo_${stage}_url`]: null,
        [`photo_${stage}_path`]: null,
      } as Partial<Recipe>,
      `${stage === "before" ? "Before" : "After"} photo removed.`,
    );
  }

  async function deleteRecipe(recipe: Recipe | null) {
    if (!recipe) {
      return;
    }

    setBusy(recipe.id);
    setError("");
    setNotice("");

    if (supabase) {
      const { error: deleteError } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipe.id);

      if (deleteError) {
        setError(deleteError.message);
        setBusy("");
        return;
      }
    }

    setRecipes((current) => current.filter((item) => item.id !== recipe.id));
    setSelectedId((current) => {
      if (current !== recipe.id) {
        return current;
      }
      return recipes.find((item) => item.id !== recipe.id)?.id ?? "";
    });
    setEditing(null);
    setNotice("Recipe deleted.");
    setBusy("");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--mint)]">
                <ChefHat size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Pint notebook</p>
                <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                  Creami Lab
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Built-in Ninja Creami recipes with editable steps, categories,
              notes, ratings, and before/after photos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[520px] sm:grid-cols-4">
            <Metric label="Recipes" value={String(recipes.length)} />
            <Metric
              label="Built in"
              value={String(recipes.filter((recipe) => recipe.built_in).length)}
            />
            <Metric label="Version sets" value={String(versionSetCount)} />
            <Metric
              label="Avg rating"
              value={averageRating === null ? "None" : averageRating.toFixed(1)}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Recipes</h2>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-3 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
                onClick={startNewRecipe}
                title="Add recipe"
                type="button"
              >
                <Plus size={16} aria-hidden="true" />
                Add
              </button>
            </div>

            <label className="mb-3 flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
              <Search size={16} aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[#777d72]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search mango, v2, more fudge..."
                  value={query}
                />
            </label>

            <label className="mb-3 flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <select
                className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">All categories</option>
                {MAJOR_CATEGORIES.map((major) => (
                  <optgroup key={major.slug} label={major.name}>
                    {MINOR_CATEGORIES.filter(
                      (minor) => minor.major_slug === major.slug,
                    ).map((minor) => (
                      <option key={minor.slug} value={minor.slug}>
                        {minor.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <select
                className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
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
            </label>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                Loading recipes...
              </div>
            ) : filteredRecipes.length ? (
              filteredRecipes.map((recipe) => (
                <button
                  className={`w-full rounded-md border p-4 text-left transition ${
                    selectedRecipe?.id === recipe.id
                      ? "border-[var(--mint)] bg-[var(--panel-strong)]"
                      : "border-[var(--line)] bg-[var(--panel)] hover:border-[#53625a]"
                  }`}
                  key={recipe.id}
                  onClick={() => setSelectedId(recipe.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {recipe.name}
                        </h3>
                        {recipe.version_label && (
                          <VersionBadge label={recipe.version_label} />
                        )}
                        {recipe.built_in && <BuiltInBadge />}
                      </div>
                      {recipe.version_group && (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {recipe.version_group} - {versionSummary(recipe)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {categoryText(recipe)} - {recipe.creami_setting}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Last made: {formatOptionalDate(recipe.last_made)}
                      </p>
                    </div>
                    <Rating value={recipe.family_rating} compact />
                  </div>
                  <TagRow tags={recipe.tags.slice(0, 4)} />
                </button>
              ))
            ) : (
              <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                No matching recipes.
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-5">
          {(notice || error || !supabase) && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                error
                  ? "border-[var(--berry)] bg-[#251619] text-[#ffd6db]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
              }`}
            >
              {error ||
                notice ||
                "Demo mode: add Supabase env vars to persist online."}
            </div>
          )}

          {selectedRecipe ? (
            <>
              {creamiOfTheDay && (
                <CreamiOfTheDayCard
                  onEdit={() => startEditing(creamiOfTheDay)}
                  onSelect={() => setSelectedId(creamiOfTheDay.id)}
                  recipe={creamiOfTheDay}
                />
              )}
              <RecipeDetail
                busy={busy}
                onDelete={() => deleteRecipe(selectedRecipe)}
                onEdit={() => startEditing(selectedRecipe)}
                onNewVersion={() => startNewVersion(selectedRecipe)}
                onRate={(rating) =>
                  updateRecipeFields(
                    selectedRecipe.id,
                    { family_rating: rating },
                    "Rating saved.",
                  )
                }
                onRemovePhoto={(stage) => removePhoto(selectedRecipe, stage)}
                onSelectVersion={setSelectedId}
                onUploadPhoto={(stage, event) =>
                  uploadPhoto(selectedRecipe, stage, event)
                }
                recipe={selectedRecipe}
                versionRecipes={selectedVersionRecipes}
              />
            </>
          ) : (
            <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
              <Sparkles
                className="mx-auto mb-3 text-[var(--amber)]"
                size={28}
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">No recipes yet</h2>
              <button
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
                onClick={startNewRecipe}
                type="button"
              >
                <Plus size={16} aria-hidden="true" />
                Add first recipe
              </button>
            </div>
          )}

          {editing && (
            <RecipeEditor
              busy={busy === "recipe"}
              form={editing}
              onCancel={() => setEditing(null)}
              onChange={setEditing}
              onSubmit={saveRecipe}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function BuiltInBadge() {
  return (
    <span className="rounded-md border border-[#43534a] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--mint)]">
      Built-in
    </span>
  );
}

function VersionBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-block max-w-[9rem] truncate rounded-md border border-[#4b5136] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--amber)]"
      title={label}
    >
      {label}
    </span>
  );
}

function StarRatingControl({
  disabled = false,
  onRate,
  value,
}: {
  disabled?: boolean;
  onRate: (rating: number) => void;
  value: number | null;
}) {
  return (
    <div
      aria-label="Rating from family"
      className="flex items-center gap-1"
      role="radiogroup"
    >
      {STAR_VALUES.map((rating) => (
        <button
          aria-checked={value === rating}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-[#596159] transition hover:border-[var(--line)] hover:text-[var(--amber)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          key={rating}
          onClick={() => onRate(rating)}
          role="radio"
          title={`Rate ${rating}/5`}
          type="button"
        >
          <Star
            aria-hidden="true"
            className={
              value !== null && rating <= value
                ? "fill-[var(--amber)] text-[var(--amber)]"
                : ""
            }
            size={20}
          />
          <span className="sr-only">Rate {rating}/5</span>
        </button>
      ))}
    </div>
  );
}

function Rating({
  value,
  compact = false,
}: {
  value: number | null;
  compact?: boolean;
}) {
  if (value === null) {
    return (
      <span className="text-xs text-[var(--muted)]" title="No family rating">
        Not rated
      </span>
    );
  }

  return (
    <div
      className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`}
      title={`${value}/5 family rating`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={
            index < value
              ? "fill-[var(--amber)] text-[var(--amber)]"
              : "text-[#596159]"
          }
          key={index}
          size={compact ? 13 : 18}
        />
      ))}
      <span className="sr-only">{value}/5 family rating</span>
    </div>
  );
}

function CreamiOfTheDayCard({
  onEdit,
  onSelect,
  recipe,
}: {
  onEdit: () => void;
  onSelect: () => void;
  recipe: Recipe;
}) {
  return (
    <div className="rounded-md border border-[#4b5136] bg-[#171912] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--amber)]">
            <Sparkles size={16} aria-hidden="true" />
            Creami of the Day
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            {recipe.name}
          </h2>
          {recipe.version_group && (
            <p className="mt-1 text-sm text-[#d8c98d]">
              {recipe.version_group} - {versionSummary(recipe)}
            </p>
          )}
          <p className="mt-1 text-sm text-[var(--muted)]">
            {categoryText(recipe)} - {recipe.creami_setting || "No setting"}
          </p>
          <TagRow tags={recipe.tags.slice(0, 5)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
            onClick={onSelect}
            type="button"
          >
            <Sparkles size={16} aria-hidden="true" />
            View
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-3 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
            onClick={onEdit}
            type="button"
          >
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          className="rounded-md border border-[#3b463f] bg-[#101411] px-2 py-1 text-xs text-[var(--muted)]"
          key={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function RecipeDetail({
  busy,
  onDelete,
  onEdit,
  onNewVersion,
  onRate,
  onRemovePhoto,
  onSelectVersion,
  onUploadPhoto,
  recipe,
  versionRecipes,
}: {
  busy: string;
  onDelete: () => void;
  onEdit: () => void;
  onNewVersion: () => void;
  onRate: (rating: number) => void;
  onRemovePhoto: (stage: "before" | "after") => void;
  onSelectVersion: (recipeId: string) => void;
  onUploadPhoto: (
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  recipe: Recipe;
  versionRecipes: Recipe[];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex flex-col gap-5 xl:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[var(--muted)]">
                  {categoryText(recipe)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-semibold tracking-normal">
                    {recipe.name}
                  </h2>
                  {recipe.version_label && (
                    <VersionBadge label={recipe.version_label} />
                  )}
                  {recipe.built_in && <BuiltInBadge />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--amber)]"
                  onClick={onNewVersion}
                  title="Create a new version"
                  type="button"
                >
                  <Plus size={16} aria-hidden="true" />
                  New version
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
                  onClick={onEdit}
                  title="Edit recipe"
                  type="button"
                >
                  <Edit3 size={16} aria-hidden="true" />
                  Edit
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#5c353a] px-3 text-sm text-[#ffd5dc] transition hover:border-[var(--berry)]"
                  onClick={onDelete}
                  title="Delete recipe"
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-4">
              <span>Setting: {recipe.creami_setting || "Not logged"}</span>
              <span>Last made: {formatOptionalDate(recipe.last_made)}</span>
              <span>Version: {versionSummary(recipe)}</span>
              <span>
                Rating:{" "}
                {recipe.family_rating === null
                  ? "Not rated"
                  : `${recipe.family_rating}/5`}
              </span>
            </div>
            <TagRow tags={recipe.tags} />
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <PhotoSlot
              busy={busy === `${recipe.id}-before` || busy === recipe.id}
              imageUrl={recipe.photo_before_url}
              label="Before spin"
              onRemove={() => onRemovePhoto("before")}
              onUpload={(event) => onUploadPhoto("before", event)}
            />
            <PhotoSlot
              busy={busy === `${recipe.id}-after` || busy === recipe.id}
              imageUrl={recipe.photo_after_url}
              label="After spin"
              onRemove={() => onRemovePhoto("after")}
              onUpload={(event) => onUploadPhoto("after", event)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InfoPanel onEdit={onEdit} title="Ingredients">
          <ItemList items={recipe.ingredients} />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Instructions">
          <StepList items={recipe.instructions} />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Creami setting used">
          <p>{recipe.creami_setting || "Not logged yet."}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Mix-ins">
          <p>{recipe.mix_ins || "No mix-ins logged."}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Category">
          <p>{categoryText(recipe)}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Recipe versions">
          <VersionList
            currentRecipeId={recipe.id}
            onSelect={onSelectVersion}
            recipes={versionRecipes}
          />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Last made">
          <p>{formatOptionalDate(recipe.last_made)}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Family rating">
          <div className="flex flex-wrap items-center gap-3">
            <StarRatingControl
              disabled={busy === recipe.id}
              onRate={onRate}
              value={recipe.family_rating}
            />
            <span className="text-xs text-[var(--muted)]">
              {recipe.family_rating === null
                ? "Not rated"
                : `${recipe.family_rating}/5`}
            </span>
          </div>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Notes">
          <p>{recipe.notes || "No notes yet."}</p>
        </InfoPanel>
      </div>
    </div>
  );
}

function VersionList({
  currentRecipeId,
  onSelect,
  recipes,
}: {
  currentRecipeId: string;
  onSelect: (recipeId: string) => void;
  recipes: Recipe[];
}) {
  if (!recipes.length) {
    return <p>No version family yet.</p>;
  }

  return (
    <div className="space-y-2">
      {recipes.map((recipe) => {
        const isCurrent = recipe.id === currentRecipeId;

        return (
          <button
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              isCurrent
                ? "border-[var(--amber)] bg-[#171912]"
                : "border-[var(--line)] bg-[#101411] hover:border-[#53625a]"
            }`}
            disabled={isCurrent}
            key={recipe.id}
            onClick={() => onSelect(recipe.id)}
            type="button"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{recipe.name}</span>
              {recipe.version_label && <VersionBadge label={recipe.version_label} />}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {versionSummary(recipe)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function PhotoSlot({
  busy,
  imageUrl,
  label,
  onRemove,
  onUpload,
}: {
  busy: boolean;
  imageUrl: string | null;
  label: string;
  onRemove: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[#101411] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera size={15} className="text-[var(--mint)]" aria-hidden="true" />
          {label}
        </div>
        {imageUrl && (
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--berry)] hover:text-[#ffd5dc]"
            onClick={onRemove}
            title={`Remove ${label.toLowerCase()} photo`}
            type="button"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[#28322d] bg-[#0b0e0d]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${label} photo`}
            className="h-full w-full object-cover"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[var(--muted)]">
            <ImagePlus size={24} aria-hidden="true" />
            <span>Empty photo slot</span>
          </div>
        )}
      </div>

      <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]">
        <ImagePlus size={16} aria-hidden="true" />
        {busy ? "Saving..." : imageUrl ? "Replace" : "Upload"}
        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={busy}
          onChange={onUpload}
          type="file"
        />
      </label>
    </div>
  );
}

function InfoPanel({
  children,
  onEdit,
  title,
}: {
  children: React.ReactNode;
  onEdit: () => void;
  title: string;
}) {
  return (
    <article className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--mint)]">{title}</h3>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--mint)] hover:text-[var(--foreground)]"
          onClick={onEdit}
          title={`Edit ${title}`}
          type="button"
        >
          <Edit3 size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="text-sm leading-6 text-[#ddd9cf]">{children}</div>
    </article>
  );
}

function ItemList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p>No ingredients logged.</p>;
  }

  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li className="flex gap-2" key={`${item}-${index}`}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mint)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StepList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p>No instructions logged.</p>;
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li className="flex gap-3" key={`${item}-${index}`}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-xs text-[var(--mint)]">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function RecipeEditor({
  busy,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  busy: boolean;
  form: RecipeForm;
  onCancel: () => void;
  onChange: (form: RecipeForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update<K extends keyof RecipeForm>(key: K, value: RecipeForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <form
      className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Edit recipe</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">
              {form.id ? form.name : "New Creami Pint"}
            </h2>
            {form.built_in && <BuiltInBadge />}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--berry)]"
            onClick={onCancel}
            type="button"
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            <Check size={16} aria-hidden="true" />
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Recipe name">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("name", event.target.value)}
            required
            value={form.name}
          />
        </Field>
        <Field label="Version family">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_group", event.target.value)}
            placeholder="Banana Fudge Swirl"
            value={form.version_group}
          />
        </Field>
        <Field label="Version label">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_label", event.target.value)}
            placeholder="v2 or Banana Split Edition"
            value={form.version_label}
          />
        </Field>
        <Field label="Version notes">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_notes", event.target.value)}
            placeholder="more fudge"
            value={form.version_notes}
          />
        </Field>
        <Field label="Category">
          <select
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update(
                "minor_category_slug",
                event.target.value as RecipeForm["minor_category_slug"],
              )
            }
            value={form.minor_category_slug}
          >
            {MAJOR_CATEGORIES.map((major) => (
              <optgroup key={major.slug} label={major.name}>
                {MINOR_CATEGORIES.filter(
                  (minor) => minor.major_slug === major.slug,
                ).map((minor) => (
                  <option key={minor.slug} value={minor.slug}>
                    {minor.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Creami setting used">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("creami_setting", event.target.value)
            }
            placeholder="Ice Cream, Gelato, Respin, Mix-In"
            value={form.creami_setting}
          />
        </Field>
        <Field label="Rating from family">
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[#0f1311] px-2 py-1">
            <StarRatingControl
              disabled={busy}
              onRate={(rating) => update("family_rating", String(rating))}
              value={normalizeRating(form.family_rating)}
            />
            {form.family_rating && (
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--berry)] hover:text-[#ffd5dc]"
                onClick={() => update("family_rating", "")}
                title="Clear rating"
                type="button"
              >
                <X size={15} aria-hidden="true" />
                <span className="sr-only">Clear rating</span>
              </button>
            )}
          </div>
        </Field>
        <Field label="Ingredients, one per line">
          <textarea
            className="min-h-44 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("ingredientsText", event.target.value)}
            value={form.ingredientsText}
          />
        </Field>
        <Field label="Instructions, one ordered step per line">
          <textarea
            className="min-h-44 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("instructionsText", event.target.value)}
            value={form.instructionsText}
          />
        </Field>
        <Field label="Mix-ins">
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("mix_ins", event.target.value)}
            value={form.mix_ins}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("notes", event.target.value)}
            placeholder='Dad said tastes like real kulfi'
            value={form.notes}
          />
        </Field>
        <Field label="Last made">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("last_made", event.target.value)}
            type="date"
            value={form.last_made}
          />
        </Field>
        <Field label="Tags">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("tagsText", event.target.value)}
            placeholder="mango, gelato, kulfi, fudge swirl"
            value={form.tagsText}
          />
        </Field>
        <Field label="Before photo URL">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("photo_before_url", event.target.value)
            }
            value={form.photo_before_url}
          />
        </Field>
        <Field label="After photo URL">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("photo_after_url", event.target.value)}
            value={form.photo_after_url}
          />
        </Field>
      </div>
    </form>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
