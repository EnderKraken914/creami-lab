"use client";

import Link from "next/link";
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
  type RecipeReview,
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

type ReviewForm = {
  reviewer_name: string;
  rating: string;
  notes: string;
};

type RecipeFieldPatch = Omit<Partial<Recipe>, "family_rating">;

const LOCAL_STORAGE_KEY = "creami-lab-recipes-v2";
const LOCAL_STORAGE_REVIEWS_KEY = "creami-lab-reviews-v1";
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

const emptyReviewForm: ReviewForm = {
  reviewer_name: "",
  rating: "",
  notes: "",
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

function normalizeRequiredRating(value: unknown) {
  return normalizeRating(value) ?? 0;
}

function formatRatingValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function normalizeReview(raw: unknown): RecipeReview {
  const value = raw as Record<string, unknown>;

  return {
    id: String(value.id ?? crypto.randomUUID()),
    recipe_id: String(value.recipe_id ?? ""),
    created_at: String(value.created_at ?? now()),
    reviewer_name: String(value.reviewer_name ?? "Anonymous").trim() || "Anonymous",
    rating: normalizeRequiredRating(value.rating),
    notes: String(value.notes ?? ""),
  };
}

function reviewsForRecipe(reviews: RecipeReview[], recipeId: string) {
  return reviews
    .filter((review) => review.recipe_id === recipeId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function averageReviewRating(reviews: RecipeReview[]) {
  if (!reviews.length) {
    return null;
  }

  return (
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  );
}

function sortRecipes(recipes: Recipe[]) {
  return [...recipes].sort((a, b) => a.name.localeCompare(b.name));
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

export default function RecipeWorkspace() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<RecipeForm | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
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
  const selectedReviews = useMemo(
    () => (selectedRecipe ? reviewsForRecipe(reviews, selectedRecipe.id) : []),
    [reviews, selectedRecipe],
  );
  const selectedReviewAverage = averageReviewRating(selectedReviews);
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

  const reviewedRecipes = recipes.filter((recipe) =>
    reviews.some((review) => review.recipe_id === recipe.id),
  );
  const visitorAverageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      setIsLoading(true);
      setError("");

      if (!supabase) {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        const storedReviews = window.localStorage.getItem(
          LOCAL_STORAGE_REVIEWS_KEY,
        );
        const localRecipes = stored
          ? (JSON.parse(stored) as unknown[]).map(normalizeRecipe)
          : DEFAULT_RECIPES;
        const localReviews = storedReviews
          ? (JSON.parse(storedReviews) as unknown[])
              .map(normalizeReview)
              .filter((review) => review.rating > 0 && review.recipe_id)
          : [];
        const sortedLocalRecipes = sortRecipes(localRecipes);

        if (isMounted) {
          setRecipes(sortedLocalRecipes);
          setReviews(localReviews);
          setSelectedId(sortedLocalRecipes[0]?.id ?? "");
          setIsLoading(false);
        }

        return;
      }

      const { data, error: loadError } = await supabase
        .from("recipes")
        .select("*")
        .order("name", { ascending: true });

      const { data: reviewData, error: reviewLoadError } = await supabase
        .from("recipe_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (loadError || reviewLoadError) {
        setError(loadError?.message ?? reviewLoadError?.message ?? "");
        setRecipes([]);
        setReviews([]);
      } else {
        const remoteRecipes = ((data ?? []) as unknown[]).map(normalizeRecipe);
        const sortedRemoteRecipes = sortRecipes(remoteRecipes);
        setRecipes(sortedRemoteRecipes);
        setReviews(
          ((reviewData ?? []) as unknown[])
            .map(normalizeReview)
            .filter((review) => review.rating > 0 && review.recipe_id),
        );
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
    if (!supabase && !isLoading) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recipes));
    }
  }, [isLoading, recipes, supabase]);

  useEffect(() => {
    if (!supabase && !isLoading) {
      window.localStorage.setItem(
        LOCAL_STORAGE_REVIEWS_KEY,
        JSON.stringify(reviews),
      );
    }
  }, [isLoading, reviews, supabase]);

  function selectRecipe(recipeId: string) {
    setSelectedId(recipeId);
    setReviewForm(emptyReviewForm);
  }

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
    const existingRecipe = recipes.find((recipe) => recipe.id === editing.id);

    if (!supabase) {
      const savedRecipe: Recipe = {
        id: editing.id ?? crypto.randomUUID(),
        created_at: existingRecipe?.created_at ?? now(),
        updated_at: now(),
        family_rating: existingRecipe?.family_rating ?? null,
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
      selectRecipe(savedRecipe.id);
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
    selectRecipe(savedRecipe.id);
    setEditing(null);
    setNotice("Recipe saved.");
    setBusy("");
  }

  async function updateRecipeFields(
    recipeId: string,
    fields: RecipeFieldPatch,
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

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRecipe) {
      return;
    }

    const reviewerName = reviewForm.reviewer_name.trim();
    const rating = normalizeRating(reviewForm.rating);

    if (!reviewerName) {
      setError("Add your name before submitting a review.");
      return;
    }

    if (rating === null) {
      setError("Choose a star rating before submitting a review.");
      return;
    }

    setBusy("review");
    setError("");
    setNotice("");

    const payload = {
      recipe_id: selectedRecipe.id,
      reviewer_name: reviewerName,
      rating,
      notes: reviewForm.notes.trim(),
    };

    if (!supabase) {
      const savedReview: RecipeReview = {
        id: crypto.randomUUID(),
        created_at: now(),
        ...payload,
      };

      setReviews((current) => [savedReview, ...current]);
      setReviewForm(emptyReviewForm);
      setNotice("Review saved locally.");
      setBusy("");
      return;
    }

    const { data, error: reviewError } = await supabase
      .from("recipe_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (reviewError) {
      setError(reviewError.message);
      setBusy("");
      return;
    }

    const savedReview = normalizeReview(data);
    setReviews((current) => [savedReview, ...current]);
    setReviewForm(emptyReviewForm);
    setNotice("Review saved.");
    setBusy("");
  }

  async function deleteReview(review: RecipeReview) {
    setBusy(`review-delete:${review.id}`);
    setError("");
    setNotice("");

    if (supabase) {
      const { error: deleteError } = await supabase
        .from("recipe_reviews")
        .delete()
        .eq("id", review.id);

      if (deleteError) {
        setError(deleteError.message);
        setBusy("");
        return;
      }
    }

    setReviews((current) => current.filter((item) => item.id !== review.id));
    setNotice("Review removed.");
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
        } as RecipeFieldPatch,
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
      } as RecipeFieldPatch,
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
    setReviews((current) =>
      current.filter((review) => review.recipe_id !== recipe.id),
    );
    setSelectedId((current) => {
      if (current !== recipe.id) {
        return current;
      }
      return recipes.find((item) => item.id !== recipe.id)?.id ?? "";
    });
    setReviewForm(emptyReviewForm);
    setEditing(null);
    setNotice("Recipe deleted.");
    setBusy("");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--mint)]">
                <ChefHat size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--muted)]">Pint notebook</p>
                <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                  Creami Lab
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Ninja Creami recipes with editable steps, categories,
              notes, ratings, and before/after photos.
            </p>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex justify-start lg:justify-end">
              <Link
                className="inline-flex h-9 items-center rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
                href="/"
              >
                Home
              </Link>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 text-sm xl:grid-cols-4">
              <Metric label="Recipes" value={String(recipes.length)} />
              <Metric label="Version sets" value={String(versionSetCount)} />
              <Metric label="Reviewed" value={String(reviewedRecipes.length)} />
              <Metric
                label="Avg rating"
                value={
                  visitorAverageRating === null
                    ? "None"
                    : formatRatingValue(visitorAverageRating)
                }
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5 lg:px-8 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
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
              filteredRecipes.map((recipe) => {
                const recipeReviews = reviewsForRecipe(reviews, recipe.id);

                return (
                  <button
                    className={`w-full min-w-0 rounded-md border p-3 text-left transition sm:p-4 ${
                      selectedRecipe?.id === recipe.id
                        ? "border-[var(--mint)] bg-[var(--panel-strong)]"
                        : "border-[var(--line)] bg-[var(--panel)] hover:border-[#53625a]"
                    }`}
                    key={recipe.id}
                    onClick={() => selectRecipe(recipe.id)}
                    type="button"
                  >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {recipe.name}
                        </h3>
                        {recipe.version_label && (
                          <VersionBadge label={recipe.version_label} />
                        )}
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
                    <VisitorRatingSummary
                      average={averageReviewRating(recipeReviews)}
                      compact
                      count={recipeReviews.length}
                    />
                  </div>
                  <TagRow tags={recipe.tags.slice(0, 4)} />
                </button>
                );
              })
            ) : (
              <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                No matching recipes.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
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
                "Shared database not connected. Changes save only in this browser until Supabase env vars are added."}
            </div>
          )}

          {selectedRecipe ? (
            <>
              {creamiOfTheDay && (
                <CreamiOfTheDayCard
                  onEdit={() => startEditing(creamiOfTheDay)}
                  onSelect={() => selectRecipe(creamiOfTheDay.id)}
                  recipe={creamiOfTheDay}
                />
              )}
              <RecipeDetail
                busy={busy}
                onDelete={() => deleteRecipe(selectedRecipe)}
                onDeleteReview={deleteReview}
                onEdit={() => startEditing(selectedRecipe)}
                onNewVersion={() => startNewVersion(selectedRecipe)}
                onRemovePhoto={(stage) => removePhoto(selectedRecipe, stage)}
                onReviewChange={setReviewForm}
                onReviewSubmit={submitReview}
                onSelectVersion={selectRecipe}
                onUploadPhoto={(stage, event) =>
                  uploadPhoto(selectedRecipe, stage, event)
                }
                recipe={selectedRecipe}
                reviewAverage={selectedReviewAverage}
                reviewForm={reviewForm}
                reviews={selectedReviews}
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
    <div className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-3 sm:px-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold sm:text-xl">{value}</p>
    </div>
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
      aria-label="Star rating"
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
      <span className="text-xs text-[var(--muted)]" title="No rating">
        Not rated
      </span>
    );
  }

  const filledStars = Math.round(value);

  return (
    <div
      className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`}
      title={`${formatRatingValue(value)}/5 rating`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={
            index < filledStars
              ? "fill-[var(--amber)] text-[var(--amber)]"
              : "text-[#596159]"
          }
          key={index}
          size={compact ? 13 : 18}
        />
      ))}
      <span className="sr-only">{formatRatingValue(value)}/5 rating</span>
    </div>
  );
}

function VisitorRatingSummary({
  average,
  compact = false,
  count,
}: {
  average: number | null;
  compact?: boolean;
  count: number;
}) {
  if (average === null) {
    return (
      <span className="text-xs text-[var(--muted)]" title="No visitor reviews">
        No reviews
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
      <Rating value={average} compact={compact} />
      <span className="text-xs text-[var(--muted)]">
        {formatRatingValue(average)} avg ({count})
      </span>
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
    <div className="min-w-0 rounded-md border border-[#4b5136] bg-[#171912] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--amber)]">
            <Sparkles size={16} aria-hidden="true" />
            Creami of the Day
          </div>
          <h2 className="break-words text-xl font-semibold tracking-normal sm:text-2xl">
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
        <div className="flex flex-wrap gap-2 sm:justify-end">
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
    <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          className="max-w-full break-words rounded-md border border-[#3b463f] bg-[#101411] px-2 py-1 text-xs text-[var(--muted)]"
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
  onDeleteReview,
  onEdit,
  onNewVersion,
  onRemovePhoto,
  onReviewChange,
  onReviewSubmit,
  onSelectVersion,
  onUploadPhoto,
  recipe,
  reviewAverage,
  reviewForm,
  reviews,
  versionRecipes,
}: {
  busy: string;
  onDelete: () => void;
  onDeleteReview: (review: RecipeReview) => void;
  onEdit: () => void;
  onNewVersion: () => void;
  onRemovePhoto: (stage: "before" | "after") => void;
  onReviewChange: (form: ReviewForm) => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectVersion: (recipeId: string) => void;
  onUploadPhoto: (
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  recipe: Recipe;
  reviewAverage: number | null;
  reviewForm: ReviewForm;
  reviews: RecipeReview[];
  versionRecipes: Recipe[];
}) {
  const deletingReviewId = busy.startsWith("review-delete:")
    ? busy.slice("review-delete:".length)
    : "";

  return (
    <div className="space-y-5">
      <div className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--muted)]">
                  {categoryText(recipe)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                    {recipe.name}
                  </h2>
                  {recipe.version_label && (
                    <VersionBadge label={recipe.version_label} />
                  )}
                </div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--amber)] sm:flex-none"
                  onClick={onNewVersion}
                  title="Create a new version"
                  type="button"
                >
                  <Plus size={16} aria-hidden="true" />
                  New version
                </button>
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)] sm:flex-none"
                  onClick={onEdit}
                  title="Edit recipe"
                  type="button"
                >
                  <Edit3 size={16} aria-hidden="true" />
                  Edit
                </button>
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[#5c353a] px-3 text-sm text-[#ffd5dc] transition hover:border-[var(--berry)] sm:flex-none"
                  onClick={onDelete}
                  title="Delete recipe"
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
            <div className="grid min-w-0 gap-2 text-sm text-[var(--muted)] sm:grid-cols-2 xl:grid-cols-4">
              <span>Setting: {recipe.creami_setting || "Not logged"}</span>
              <span>Last made: {formatOptionalDate(recipe.last_made)}</span>
              <span>Version: {versionSummary(recipe)}</span>
              <span>
                Rating:{" "}
                {reviewAverage === null
                  ? "No reviews"
                  : `${formatRatingValue(reviewAverage)}/5 (${reviews.length})`}
              </span>
            </div>
            <TagRow tags={recipe.tags} />
          </div>

          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
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

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
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
        <InfoPanel title="Recipe rating">
          <div className="flex flex-wrap items-center gap-3">
            <Rating value={reviewAverage} />
            <span className="text-xs text-[var(--muted)]">
              {reviewAverage === null
                ? "No reviews yet"
                : `${formatRatingValue(reviewAverage)}/5 from ${
                    reviews.length
                  } review${reviews.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </InfoPanel>
        <ReviewPanel
          busy={busy === "review"}
          deletingReviewId={deletingReviewId}
          form={reviewForm}
          onChange={onReviewChange}
          onDeleteReview={onDeleteReview}
          onSubmit={onReviewSubmit}
          reviewAverage={reviewAverage}
          reviews={reviews}
        />
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
    <div className="min-w-0 space-y-2">
      {recipes.map((recipe) => {
        const isCurrent = recipe.id === currentRecipeId;

        return (
          <button
            className={`w-full min-w-0 rounded-md border px-3 py-2 text-left transition ${
              isCurrent
                ? "border-[var(--amber)] bg-[#171912]"
                : "border-[var(--line)] bg-[#101411] hover:border-[#53625a]"
            }`}
            disabled={isCurrent}
            key={recipe.id}
            onClick={() => onSelect(recipe.id)}
            type="button"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words font-medium">
                {recipe.name}
              </span>
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

function ReviewPanel({
  busy,
  deletingReviewId,
  form,
  onChange,
  onDeleteReview,
  onSubmit,
  reviewAverage,
  reviews,
}: {
  busy: boolean;
  deletingReviewId: string;
  form: ReviewForm;
  onChange: (form: ReviewForm) => void;
  onDeleteReview: (review: RecipeReview) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reviewAverage: number | null;
  reviews: RecipeReview[];
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--mint)]">
            Visitor reviews
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {reviewAverage === null
              ? "No visitor average yet"
              : `${formatRatingValue(reviewAverage)}/5 average from ${
                  reviews.length
                } review${reviews.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <VisitorRatingSummary
          average={reviewAverage}
          count={reviews.length}
          compact
        />
      </div>

      <form
        className="grid min-w-0 gap-3 rounded-md border border-[#28322d] bg-[#101411] p-3 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={onSubmit}
      >
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-[var(--muted)]">
              Your name
            </span>
            <input
              className="h-10 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
              onChange={(event) =>
                onChange({ ...form, reviewer_name: event.target.value })
              }
              placeholder="Dad"
              value={form.reviewer_name}
            />
          </label>
          <label className="space-y-2">
            <span className="block text-sm font-medium text-[var(--muted)]">
              Your rating
            </span>
            <div className="flex min-h-10 min-w-0 items-center overflow-x-auto rounded-md border border-[var(--line)] bg-[#0f1311] px-1">
              <StarRatingControl
                disabled={busy}
                onRate={(rating) => onChange({ ...form, rating: String(rating) })}
                value={normalizeRating(form.rating)}
              />
            </div>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="block text-sm font-medium text-[var(--muted)]">
              Review notes
            </span>
            <textarea
              className="min-h-20 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
              onChange={(event) =>
                onChange({ ...form, notes: event.target.value })
              }
              placeholder="Tastes like real kulfi, needs more pistachio..."
              value={form.notes}
            />
          </label>
        </div>
        <div className="flex md:items-end">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            disabled={busy}
            type="submit"
          >
            <Star size={16} aria-hidden="true" />
            {busy ? "Saving..." : "Post"}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {reviews.length ? (
          reviews.map((review) => (
            <article
              className="min-w-0 rounded-md border border-[#28322d] bg-[#101411] p-3"
              key={review.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 break-words">
                  <h4 className="break-words text-sm font-semibold">
                    {review.reviewer_name}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatDate(review.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Rating value={review.rating} compact />
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--berry)] hover:text-[#ffd5dc] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deletingReviewId === review.id}
                    onClick={() => onDeleteReview(review)}
                    title="Remove review"
                    type="button"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span className="sr-only">Remove review</span>
                  </button>
                </div>
              </div>
              <p className="mt-3 break-words text-sm leading-6 text-[#ddd9cf]">
                {review.notes || "No notes left."}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-[#28322d] bg-[#101411] p-3 text-sm text-[var(--muted)]">
            No visitor reviews yet.
          </p>
        )}
      </div>
    </article>
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
    <div className="min-w-0 rounded-md border border-[var(--line)] bg-[#101411] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0 break-words flex items-center gap-2 text-sm font-medium">
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
  onEdit?: () => void;
  title: string;
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="min-w-0 break-words text-sm font-semibold text-[var(--mint)]">
          {title}
        </h3>
        {onEdit && (
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--mint)] hover:text-[var(--foreground)]"
            onClick={onEdit}
            title={`Edit ${title}`}
            type="button"
          >
            <Edit3 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="min-w-0 break-words text-sm leading-6 text-[#ddd9cf]">
        {children}
      </div>
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
        <li className="flex min-w-0 gap-2" key={`${item}-${index}`}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mint)]" />
          <span className="min-w-0 break-words">{item}</span>
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
    <ul className="space-y-2">
      {items.map((item, index) => {
        const numberedStep = parseNumberedInstruction(item);

        return (
          <li className="flex min-w-0 gap-3" key={`${item}-${index}`}>
            {numberedStep && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-xs text-[var(--mint)]">
                {numberedStep.number}
              </span>
            )}
            <span className="min-w-0 break-words">
              {numberedStep?.text ?? item}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function parseNumberedInstruction(item: string) {
  const match = item.match(/^\s*(\d+)\.(?!\d)\s*(.*)$/);

  if (!match) {
    return null;
  }

  return {
    number: match[1],
    text: match[2].trim(),
  };
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
      className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5"
      onSubmit={onSubmit}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted)]">Edit recipe</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-xl font-semibold sm:text-2xl">
              {form.id ? form.name : "New Creami Pint"}
            </h2>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--berry)] sm:flex-none"
            onClick={onCancel}
            type="button"
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </button>
          <button
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            disabled={busy}
            type="submit"
          >
            <Check size={16} aria-hidden="true" />
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Field label="Recipe name">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("name", event.target.value)}
            required
            value={form.name}
          />
        </Field>
        <Field label="Version family">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_group", event.target.value)}
            placeholder="Banana Fudge Swirl"
            value={form.version_group}
          />
        </Field>
        <Field label="Version label">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_label", event.target.value)}
            placeholder="v2 or Banana Split Edition"
            value={form.version_label}
          />
        </Field>
        <Field label="Version notes">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("version_notes", event.target.value)}
            placeholder="more fudge"
            value={form.version_notes}
          />
        </Field>
        <Field label="Category">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
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
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("creami_setting", event.target.value)
            }
            placeholder="Ice Cream, Gelato, Respin, Mix-In"
            value={form.creami_setting}
          />
        </Field>
        <Field label="Ingredients, one per line">
          <textarea
            className="min-h-44 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("ingredientsText", event.target.value)}
            value={form.ingredientsText}
          />
        </Field>
        <Field label="Instructions, one per line">
          <textarea
            className="min-h-44 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("instructionsText", event.target.value)}
            value={form.instructionsText}
          />
        </Field>
        <Field label="Mix-ins">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("mix_ins", event.target.value)}
            value={form.mix_ins}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("notes", event.target.value)}
            placeholder='Dad said tastes like real kulfi'
            value={form.notes}
          />
        </Field>
        <Field label="Last made">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("last_made", event.target.value)}
            type="date"
            value={form.last_made}
          />
        </Field>
        <Field label="Tags">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("tagsText", event.target.value)}
            placeholder="mango, gelato, kulfi, fudge swirl"
            value={form.tagsText}
          />
        </Field>
        <Field label="Before photo URL">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("photo_before_url", event.target.value)
            }
            value={form.photo_before_url}
          />
        </Field>
        <Field label="After photo URL">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
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
    <label className="min-w-0 space-y-2">
      <span className="block text-sm font-medium text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
