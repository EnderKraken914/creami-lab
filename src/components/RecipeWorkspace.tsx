"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  Check,
  ChefHat,
  Copy,
  Download,
  Edit3,
  FlaskConical,
  Heart,
  ImagePlus,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import AdminLogin, { type AdminSessionState } from "@/components/AdminLogin";
import { PINT_RULES } from "@/lib/rules";
import { getSupabaseClient, PHOTO_BUCKET } from "@/lib/supabase";
import {
  DEFAULT_RECIPES,
  DIFFICULTY_LEVELS,
  MAJOR_CATEGORIES,
  MINOR_CATEGORIES,
  MIX_IN_TIMINGS,
  PHOTO_LABELS,
  RESULT_LEVELS,
  CREAMI_PROGRAMS,
  SUGGESTED_TAGS,
  TEXTURE_RESULTS,
  getMajorForMinor,
  getMinorCategory,
  type MajorCategorySlug,
  type MinorCategorySlug,
  type Recipe,
  type RecipeExperiment,
  type RecipePhoto,
  type RecipeReview,
} from "@/lib/recipes";

type RecipeForm = {
  id?: string;
  slug?: string | null;
  name: string;
  description: string;
  version_group: string;
  version_label: string;
  version_number: string;
  version_notes: string;
  ingredientsText: string;
  instructionsText: string;
  creami_setting: string;
  prep_time: string;
  freeze_time: string;
  spin_setting: string;
  program_used: string;
  respin_count: string;
  respin_liquid: string;
  respin_liquid_amount: string;
  respin_instructions: string;
  mix_ins: string;
  mix_in_amount: string;
  mix_in_timing: string;
  mix_in_instructions: string;
  notes: string;
  tagsText: string;
  personal_rating: string;
  photo_before_url: string;
  photo_before_path: string;
  photo_after_url: string;
  photo_after_path: string;
  photos: RecipePhoto[];
  serving_size: string;
  source_origin: string;
  difficulty: string;
  texture_result: string;
  sweetness_result: string;
  flavor_strength_result: string;
  spin_notes: string;
  favorite: boolean;
  family_approved: boolean;
  tested: boolean;
  would_make_again: boolean;
  experiments: RecipeExperiment[];
  built_in: boolean;
  last_made: string;
  major_category_slug: MajorCategorySlug;
  minor_category_slug: MinorCategorySlug | "";
};

type ReviewForm = {
  reviewer_name: string;
  rating: string;
  notes: string;
  would_eat_again: boolean;
};

type ExperimentForm = {
  date: string;
  what_changed: string;
  why_changed: string;
  result: string;
  texture_notes: string;
  flavor_notes: string;
  sweetness_notes: string;
  family_reaction: string;
  would_repeat: boolean;
};

type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
  count: number;
};

type RatingFilter = "all" | "4+" | "5";

type RecipeFieldPatch = Omit<Partial<Recipe>, "family_rating">;

const LOCAL_STORAGE_KEY = "creami-lab-recipes-v2";
const LOCAL_STORAGE_REVIEWS_KEY = "creami-lab-reviews-v1";
const LOCAL_STORAGE_SHOPPING_KEY = "creami-lab-shopping-v1";
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function minorCategoriesForMajor(majorSlug: MajorCategorySlug) {
  return MINOR_CATEGORIES.filter((minor) => minor.major_slug === majorSlug);
}

function firstMinorForMajor(majorSlug: MajorCategorySlug) {
  return minorCategoriesForMajor(majorSlug)[0]?.slug ?? "ice-cream";
}

const emptyForm: RecipeForm = {
  name: "",
  description: "",
  version_group: "",
  version_label: "",
  version_number: "",
  version_notes: "",
  ingredientsText: "",
  instructionsText: "",
  creami_setting: "",
  prep_time: "",
  freeze_time: "",
  spin_setting: "",
  program_used: "",
  respin_count: "0",
  respin_liquid: "",
  respin_liquid_amount: "",
  respin_instructions: "",
  mix_ins: "",
  mix_in_amount: "",
  mix_in_timing: "",
  mix_in_instructions: "",
  notes: "",
  tagsText: "",
  personal_rating: "",
  photo_before_url: "",
  photo_before_path: "",
  photo_after_url: "",
  photo_after_path: "",
  photos: [],
  serving_size: "",
  source_origin: "",
  difficulty: "",
  texture_result: "",
  sweetness_result: "",
  flavor_strength_result: "",
  spin_notes: "",
  favorite: false,
  family_approved: false,
  tested: false,
  would_make_again: false,
  experiments: [],
  built_in: false,
  last_made: "",
  major_category_slug: "scoop",
  minor_category_slug: "ice-cream",
};

const emptyReviewForm: ReviewForm = {
  reviewer_name: "",
  rating: "",
  notes: "",
  would_eat_again: false,
};

const emptyExperimentForm: ExperimentForm = {
  date: "",
  what_changed: "",
  why_changed: "",
  result: "",
  texture_notes: "",
  flavor_notes: "",
  sweetness_notes: "",
  family_reaction: "",
  would_repeat: false,
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

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeCount(value: unknown) {
  const parsed = normalizeOptionalNumber(value);
  return parsed && parsed > 0 ? parsed : 0;
}

function normalizePhotos(value: unknown, fallback: RecipePhoto[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .map((item) => {
      const photo = item as Record<string, unknown>;
      const url = normalizeString(photo.url).trim();

      if (!url) {
        return null;
      }

      return {
        id: normalizeString(photo.id, crypto.randomUUID()),
        label: normalizeString(photo.label, "Recipe photo"),
        url,
        path: normalizeOptionalText(photo.path),
        created_at: normalizeString(photo.created_at, now()),
      };
    })
    .filter((photo): photo is RecipePhoto => Boolean(photo));
}

function normalizeExperiments(
  value: unknown,
  fallback: RecipeExperiment[] = [],
) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item) => {
    const experiment = item as Record<string, unknown>;

    return {
      id: normalizeString(experiment.id, crypto.randomUUID()),
      date: normalizeString(experiment.date),
      what_changed: normalizeString(experiment.what_changed),
      why_changed: normalizeString(experiment.why_changed),
      result: normalizeString(experiment.result),
      texture_notes: normalizeString(experiment.texture_notes),
      flavor_notes: normalizeString(experiment.flavor_notes),
      sweetness_notes: normalizeString(experiment.sweetness_notes),
      family_reaction: normalizeString(experiment.family_reaction),
      would_repeat: normalizeBoolean(experiment.would_repeat),
    };
  });
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

function nextVersionNumber(recipe: Recipe, recipes: Recipe[]) {
  const family = versionFamilyName(recipe);
  const familyKey = normalizeVersionKey(family);

  return (
    recipes.reduce((max, item) => {
      const itemFamilyKey = normalizeVersionKey(
        item.version_group || versionFamilyName(item),
      );

      if (itemFamilyKey !== familyKey) {
        return max;
      }

      return Math.max(max, item.version_number ?? 0);
    }, 0) + 1
  );
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
    description: normalizeString(value.description, fallback?.description ?? ""),
    version_group: normalizeOptionalText(
      value.version_group ?? fallback?.version_group,
    ),
    version_label: normalizeOptionalText(
      value.version_label ?? fallback?.version_label,
    ),
    version_number: normalizeOptionalNumber(
      value.version_number ?? fallback?.version_number,
    ),
    version_notes: String(value.version_notes ?? fallback?.version_notes ?? ""),
    ingredients: normalizeTextList(value.ingredients ?? fallback?.ingredients),
    instructions: normalizeTextList(
      value.instructions ?? fallback?.instructions,
    ),
    creami_setting: String(
      value.creami_setting ?? fallback?.creami_setting ?? "",
    ),
    prep_time: normalizeString(value.prep_time, fallback?.prep_time ?? ""),
    freeze_time: normalizeString(value.freeze_time, fallback?.freeze_time ?? ""),
    spin_setting: normalizeString(
      value.spin_setting,
      fallback?.spin_setting ?? String(value.creami_setting ?? ""),
    ),
    program_used: normalizeString(
      value.program_used,
      fallback?.program_used ?? "",
    ),
    respin_count: normalizeCount(value.respin_count ?? fallback?.respin_count),
    respin_liquid: normalizeString(
      value.respin_liquid,
      fallback?.respin_liquid ?? "",
    ),
    respin_liquid_amount: normalizeString(
      value.respin_liquid_amount,
      fallback?.respin_liquid_amount ?? "",
    ),
    respin_instructions: normalizeString(
      value.respin_instructions,
      fallback?.respin_instructions ?? "",
    ),
    mix_ins: String(value.mix_ins ?? fallback?.mix_ins ?? ""),
    mix_in_amount: normalizeString(
      value.mix_in_amount,
      fallback?.mix_in_amount ?? "",
    ),
    mix_in_timing: normalizeString(
      value.mix_in_timing,
      fallback?.mix_in_timing ?? "",
    ),
    mix_in_instructions: normalizeString(
      value.mix_in_instructions,
      fallback?.mix_in_instructions ?? "",
    ),
    family_rating: normalizeRating(
      value.family_rating ?? fallback?.family_rating,
    ),
    personal_rating: normalizeRating(
      value.personal_rating ?? fallback?.personal_rating,
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
    photos: normalizePhotos(value.photos, fallback?.photos ?? []),
    built_in: Boolean(value.built_in ?? fallback?.built_in ?? false),
    last_made:
      typeof value.last_made === "string" && value.last_made.length
        ? value.last_made
        : null,
    minor_category_slug: getMinorCategory(String(value.minor_category_slug))
      ? (String(value.minor_category_slug) as MinorCategorySlug)
      : fallback?.minor_category_slug ?? null,
    serving_size: normalizeString(
      value.serving_size,
      fallback?.serving_size ?? "",
    ),
    source_origin: normalizeString(
      value.source_origin,
      fallback?.source_origin ?? "",
    ),
    difficulty: normalizeString(value.difficulty, fallback?.difficulty ?? ""),
    texture_result: normalizeString(
      value.texture_result,
      fallback?.texture_result ?? "",
    ),
    sweetness_result: normalizeString(
      value.sweetness_result,
      fallback?.sweetness_result ?? "",
    ),
    flavor_strength_result: normalizeString(
      value.flavor_strength_result,
      fallback?.flavor_strength_result ?? "",
    ),
    spin_notes: normalizeString(value.spin_notes, fallback?.spin_notes ?? ""),
    favorite: normalizeBoolean(value.favorite, fallback?.favorite ?? false),
    family_approved: normalizeBoolean(
      value.family_approved,
      fallback?.family_approved ?? false,
    ),
    tested: normalizeBoolean(value.tested, fallback?.tested ?? false),
    would_make_again: normalizeBoolean(
      value.would_make_again,
      fallback?.would_make_again ?? false,
    ),
    experiments: normalizeExperiments(
      value.experiments,
      fallback?.experiments ?? [],
    ),
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
    would_eat_again: normalizeBoolean(value.would_eat_again),
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
  const majorCategorySlug =
    getMajorForMinor(recipe.minor_category_slug)?.slug ?? "scoop";

  return {
    id: recipe.id,
    slug: recipe.slug,
    name: recipe.name,
    description: recipe.description,
    version_group: recipe.version_group ?? "",
    version_label: recipe.version_label ?? "",
    version_number: recipe.version_number ? String(recipe.version_number) : "",
    version_notes: recipe.version_notes,
    ingredientsText: recipe.ingredients.join("\n"),
    instructionsText: recipe.instructions.join("\n"),
    creami_setting: recipe.creami_setting,
    prep_time: recipe.prep_time,
    freeze_time: recipe.freeze_time,
    spin_setting: recipe.spin_setting,
    program_used: recipe.program_used,
    respin_count: String(recipe.respin_count),
    respin_liquid: recipe.respin_liquid,
    respin_liquid_amount: recipe.respin_liquid_amount,
    respin_instructions: recipe.respin_instructions,
    mix_ins: recipe.mix_ins,
    mix_in_amount: recipe.mix_in_amount,
    mix_in_timing: recipe.mix_in_timing,
    mix_in_instructions: recipe.mix_in_instructions,
    notes: recipe.notes,
    tagsText: recipe.tags.join(", "),
    personal_rating: recipe.personal_rating ? String(recipe.personal_rating) : "",
    photo_before_url: recipe.photo_before_url ?? "",
    photo_before_path: recipe.photo_before_path ?? "",
    photo_after_url: recipe.photo_after_url ?? "",
    photo_after_path: recipe.photo_after_path ?? "",
    photos: recipe.photos,
    serving_size: recipe.serving_size,
    source_origin: recipe.source_origin,
    difficulty: recipe.difficulty,
    texture_result: recipe.texture_result,
    sweetness_result: recipe.sweetness_result,
    flavor_strength_result: recipe.flavor_strength_result,
    spin_notes: recipe.spin_notes,
    favorite: recipe.favorite,
    family_approved: recipe.family_approved,
    tested: recipe.tested,
    would_make_again: recipe.would_make_again,
    experiments: recipe.experiments,
    built_in: recipe.built_in,
    last_made: recipe.last_made ?? "",
    major_category_slug: majorCategorySlug,
    minor_category_slug:
      recipe.minor_category_slug ?? firstMinorForMajor(majorCategorySlug),
  };
}

function formToPayload(form: RecipeForm) {
  return {
    slug: form.slug ?? null,
    name: form.name.trim() || "Untitled pint",
    description: form.description.trim(),
    version_group: form.version_group.trim() || null,
    version_label: form.version_label.trim() || null,
    version_number: normalizeOptionalNumber(form.version_number),
    version_notes: form.version_notes.trim(),
    ingredients: splitLines(form.ingredientsText),
    instructions: splitLines(form.instructionsText),
    creami_setting: form.creami_setting.trim(),
    prep_time: form.prep_time.trim(),
    freeze_time: form.freeze_time.trim(),
    spin_setting: form.spin_setting.trim(),
    program_used: form.program_used.trim(),
    respin_count: normalizeCount(form.respin_count),
    respin_liquid: form.respin_liquid.trim(),
    respin_liquid_amount: form.respin_liquid_amount.trim(),
    respin_instructions: form.respin_instructions.trim(),
    mix_ins: form.mix_ins.trim(),
    mix_in_amount: form.mix_in_amount.trim(),
    mix_in_timing: form.mix_in_timing.trim(),
    mix_in_instructions: form.mix_in_instructions.trim(),
    notes: form.notes.trim(),
    tags: normalizeTags(form.tagsText),
    personal_rating: normalizeRating(form.personal_rating),
    photo_before_url: form.photo_before_url.trim() || null,
    photo_before_path: form.photo_before_path.trim() || null,
    photo_after_url: form.photo_after_url.trim() || null,
    photo_after_path: form.photo_after_path.trim() || null,
    photos: form.photos,
    serving_size: form.serving_size.trim(),
    source_origin: form.source_origin.trim(),
    difficulty: form.difficulty.trim(),
    texture_result: form.texture_result.trim(),
    sweetness_result: form.sweetness_result.trim(),
    flavor_strength_result: form.flavor_strength_result.trim(),
    spin_notes: form.spin_notes.trim(),
    favorite: form.favorite,
    family_approved: form.family_approved,
    tested: form.tested,
    would_make_again: form.would_make_again,
    experiments: form.experiments,
    built_in: form.built_in,
    last_made: form.last_made || null,
    minor_category_slug:
      form.minor_category_slug || firstMinorForMajor(form.major_category_slug),
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

function minorCategoryText(recipe: Recipe) {
  return getMinorCategory(recipe.minor_category_slug)?.name ?? "Uncategorized";
}

function recipePrimaryPhoto(recipe: Recipe) {
  return (
    recipe.photo_after_url ||
    recipe.photos.find((photo) => photo.label === "Final serving")?.url ||
    recipe.photos[0]?.url ||
    recipe.photo_before_url ||
    null
  );
}

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function shortText(value: string, length = 110) {
  const trimmed = value.trim();
  return trimmed.length > length ? `${trimmed.slice(0, length - 1)}...` : trimmed;
}

function parseAmountToken(value: string) {
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }

  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal : null;
}

function formatScaledAmount(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function scaleIngredient(ingredient: string, multiplier: number) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier === 1) {
    return ingredient;
  }

  const match = ingredient.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)(.*)$/);

  if (!match) {
    return ingredient;
  }

  const parsed = parseAmountToken(match[1]);

  if (parsed === null) {
    return ingredient;
  }

  return `${formatScaledAmount(parsed * multiplier)}${match[2]}`;
}

function buildShoppingItems(recipes: Recipe[]) {
  const grouped = new Map<string, ShoppingItem>();

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const text = ingredient.trim();
      const key = text.toLowerCase();
      const existing = grouped.get(key);

      grouped.set(key, {
        id: existing?.id ?? crypto.randomUUID(),
        text,
        checked: false,
        count: (existing?.count ?? 0) + 1,
      });
    });
  });

  return Array.from(grouped.values()).sort((a, b) => a.text.localeCompare(b.text));
}

export default function RecipeWorkspace() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [adminSession, setAdminSession] = useState<AdminSessionState>({
    email: "",
    isAdmin: false,
    isSignedIn: false,
    status: "checking",
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<RecipeForm | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm);
  const [editingReviewId, setEditingReviewId] = useState("");
  const [reviewEditForm, setReviewEditForm] =
    useState<ReviewForm>(emptyReviewForm);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [majorCategoryFilter, setMajorCategoryFilter] = useState<
    MajorCategorySlug | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<
    MinorCategorySlug | "all"
  >("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [settingFilter, setSettingFilter] = useState("all");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const storedShopping = window.localStorage.getItem(LOCAL_STORAGE_SHOPPING_KEY);
    return storedShopping ? (JSON.parse(storedShopping) as ShoppingItem[]) : [];
  });
  const [customShoppingItem, setCustomShoppingItem] = useState("");
  const [scaleMultiplier, setScaleMultiplier] = useState("1");
  const [experimentForm, setExperimentForm] =
    useState<ExperimentForm>(emptyExperimentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const canManageRecipes = !supabase || adminSession.isAdmin;

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
  const allSettings = useMemo(
    () =>
      Array.from(
        new Set(
          recipes
            .flatMap((recipe) => [recipe.program_used, recipe.spin_setting])
            .map((setting) => setting.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [recipes],
  );
  const filteredMinorCategories = useMemo(
    () =>
      majorCategoryFilter === "all"
        ? MINOR_CATEGORIES
        : minorCategoriesForMajor(majorCategoryFilter),
    [majorCategoryFilter],
  );

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortRecipes(
      recipes.filter((recipe) => {
        const searchable = [
          recipe.name,
          recipe.description,
          recipe.ingredients.join(" "),
          recipe.instructions.join(" "),
          recipe.creami_setting,
          recipe.spin_setting,
          recipe.program_used,
          recipe.mix_ins,
          recipe.notes,
          recipe.source_origin,
          recipe.texture_result,
          recipe.sweetness_result,
          recipe.flavor_strength_result,
          recipe.spin_notes,
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
        const recipeMajorSlug = getMajorForMinor(
          recipe.minor_category_slug,
        )?.slug;
        const matchesMajorCategory =
          majorCategoryFilter === "all" ||
          recipeMajorSlug === majorCategoryFilter;
        const matchesMinorCategory =
          categoryFilter === "all" ||
          recipe.minor_category_slug === categoryFilter;
        const recipeAverage = averageReviewRating(
          reviewsForRecipe(reviews, recipe.id),
        );
        const matchesRating =
          ratingFilter === "all" ||
          (ratingFilter === "4+" &&
            recipeAverage !== null &&
            recipeAverage >= 4) ||
          (ratingFilter === "5" && recipeAverage === 5);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "favorite" && recipe.favorite) ||
          (statusFilter === "family-approved" && recipe.family_approved) ||
          (statusFilter === "tested" && recipe.tested) ||
          (statusFilter === "experimental" && !recipe.tested);
        const matchesSetting =
          settingFilter === "all" ||
          recipe.program_used === settingFilter ||
          recipe.spin_setting === settingFilter;

        return (
          matchesQuery &&
          matchesTag &&
          matchesMajorCategory &&
          matchesMinorCategory &&
          matchesRating &&
          matchesStatus &&
          matchesSetting
        );
      }),
    );
  }, [
    categoryFilter,
    majorCategoryFilter,
    query,
    ratingFilter,
    recipes,
    reviews,
    settingFilter,
    statusFilter,
    tagFilter,
  ]);

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
        const storedShopping = window.localStorage.getItem(
          LOCAL_STORAGE_SHOPPING_KEY,
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
          setShoppingItems(
            storedShopping
              ? (JSON.parse(storedShopping) as ShoppingItem[])
              : [],
          );
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

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_SHOPPING_KEY,
      JSON.stringify(shoppingItems),
    );
  }, [shoppingItems]);

  function selectRecipe(recipeId: string) {
    setSelectedId(recipeId);
    setReviewForm(emptyReviewForm);
    setEditingReviewId("");
    setReviewEditForm(emptyReviewForm);
  }

  function changeMajorCategoryFilter(value: MajorCategorySlug | "all") {
    setMajorCategoryFilter(value);

    if (value !== "all") {
      const selectedMinor = getMinorCategory(categoryFilter);

      if (selectedMinor && selectedMinor.major_slug !== value) {
        setCategoryFilter("all");
      }
    }
  }

  function requireAdmin(action = "change recipes") {
    if (canManageRecipes) {
      return true;
    }

    setError(`Admin login required to ${action}.`);
    setNotice("");
    return false;
  }

  function startNewRecipe() {
    if (!requireAdmin("add recipes")) {
      return;
    }

    setEditing({
      ...emptyForm,
      name: "New Creami Pint",
      tagsText: "",
    });
    setNotice("");
  }

  function startEditing(recipe: Recipe | null) {
    if (!requireAdmin("edit recipes")) {
      return;
    }

    if (!recipe) {
      startNewRecipe();
      return;
    }

    setEditing(toForm(recipe));
    setNotice("");
  }

  function startNewVersion(recipe: Recipe | null) {
    if (!requireAdmin("create recipe versions")) {
      return;
    }

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
      photos: [],
      version_group: family,
      version_label: nextVersionLabel(recipe, recipes),
      version_number: String(nextVersionNumber(recipe, recipes)),
      version_notes: "",
      experiments: [],
      tested: false,
      family_approved: false,
      favorite: false,
    });
    setNotice("");
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    if (!requireAdmin("save recipes")) {
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
    if (!requireAdmin("update recipes")) {
      return;
    }

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
      would_eat_again: reviewForm.would_eat_again,
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

  function startEditingReview(review: RecipeReview) {
    setEditingReviewId(review.id);
    setReviewEditForm({
      reviewer_name: review.reviewer_name,
      rating: String(review.rating),
      notes: review.notes,
      would_eat_again: review.would_eat_again,
    });
    setError("");
    setNotice("");
  }

  function cancelEditingReview() {
    setEditingReviewId("");
    setReviewEditForm(emptyReviewForm);
  }

  async function saveReviewEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingReviewId) {
      return;
    }

    const reviewerName = reviewEditForm.reviewer_name.trim();
    const rating = normalizeRating(reviewEditForm.rating);

    if (!reviewerName) {
      setError("Add a name before updating the review.");
      return;
    }

    if (rating === null) {
      setError("Choose a star rating before updating the review.");
      return;
    }

    setBusy(`review-edit:${editingReviewId}`);
    setError("");
    setNotice("");

    const payload = {
      reviewer_name: reviewerName,
      rating,
      notes: reviewEditForm.notes.trim(),
      would_eat_again: reviewEditForm.would_eat_again,
    };

    if (!supabase) {
      setReviews((current) =>
        current.map((review) =>
          review.id === editingReviewId ? { ...review, ...payload } : review,
        ),
      );
      cancelEditingReview();
      setNotice("Review updated locally.");
      setBusy("");
      return;
    }

    const { data, error: reviewError } = await supabase
      .from("recipe_reviews")
      .update(payload)
      .eq("id", editingReviewId)
      .select("*")
      .single();

    if (reviewError) {
      setError(reviewError.message);
      setBusy("");
      return;
    }

    const updatedReview = normalizeReview(data);
    setReviews((current) =>
      current.map((review) =>
        review.id === updatedReview.id ? updatedReview : review,
      ),
    );
    cancelEditingReview();
    setNotice("Review updated.");
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

    if (!requireAdmin("upload recipe photos")) {
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

    if (!requireAdmin("remove recipe photos")) {
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

  async function uploadLabeledPhoto(
    recipe: Recipe | null,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!recipe || !file) {
      return;
    }

    if (!requireAdmin("upload recipe photos")) {
      return;
    }

    setBusy(`${recipe.id}-${label}`);
    setError("");
    setNotice("");

    let publicUrl = "";
    let path: string | null = null;

    try {
      if (supabase) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        path = `${recipe.id}/${safeLabel}-${Date.now()}.${extension}`;
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

      const nextPhotos = [
        ...recipe.photos.filter((photo) => photo.label !== label),
        {
          id: crypto.randomUUID(),
          label,
          url: publicUrl,
          path,
          created_at: now(),
        },
      ];

      await updateRecipeFields(
        recipe.id,
        { photos: nextPhotos },
        `${label} photo saved.`,
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

  async function removeLabeledPhoto(recipe: Recipe | null, label: string) {
    if (!recipe) {
      return;
    }

    if (!requireAdmin("remove recipe photos")) {
      return;
    }

    const photo = recipe.photos.find((item) => item.label === label);

    if (supabase && photo?.path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
    }

    await updateRecipeFields(
      recipe.id,
      { photos: recipe.photos.filter((item) => item.label !== label) },
      `${label} photo removed.`,
    );
  }

  async function deleteRecipe(recipe: Recipe | null) {
    if (!recipe) {
      return;
    }

    if (!requireAdmin("delete recipes")) {
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

  async function toggleRecipeField(
    recipe: Recipe | null,
    field: "favorite" | "family_approved" | "would_make_again" | "tested",
  ) {
    if (!recipe) {
      return;
    }

    await updateRecipeFields(
      recipe.id,
      { [field]: !recipe[field] } as RecipeFieldPatch,
      "Recipe status updated.",
    );
  }

  async function markMadeAgain(recipe: Recipe | null) {
    if (!recipe) {
      return;
    }

    await updateRecipeFields(
      recipe.id,
      {
        last_made: getTodayInputDate(),
        would_make_again: true,
        tested: true,
      },
      "Marked as made today.",
    );
  }

  async function submitExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRecipe) {
      return;
    }

    if (!requireAdmin("save experiments")) {
      return;
    }

    const entry: RecipeExperiment = {
      id: crypto.randomUUID(),
      date: experimentForm.date || getTodayInputDate(),
      what_changed: experimentForm.what_changed.trim(),
      why_changed: experimentForm.why_changed.trim(),
      result: experimentForm.result.trim(),
      texture_notes: experimentForm.texture_notes.trim(),
      flavor_notes: experimentForm.flavor_notes.trim(),
      sweetness_notes: experimentForm.sweetness_notes.trim(),
      family_reaction: experimentForm.family_reaction.trim(),
      would_repeat: experimentForm.would_repeat,
    };

    if (!entry.what_changed && !entry.result) {
      setError("Add what changed or the result before saving an experiment.");
      return;
    }

    await updateRecipeFields(
      selectedRecipe.id,
      { experiments: [entry, ...selectedRecipe.experiments] },
      "Experiment saved.",
    );
    setExperimentForm(emptyExperimentForm);
  }

  async function deleteExperiment(recipe: Recipe, experimentId: string) {
    if (!requireAdmin("delete experiments")) {
      return;
    }

    await updateRecipeFields(
      recipe.id,
      {
        experiments: recipe.experiments.filter(
          (experiment) => experiment.id !== experimentId,
        ),
      },
      "Experiment removed.",
    );
  }

  function generateShoppingList(sourceRecipes: Recipe[]) {
    setShoppingItems(buildShoppingItems(sourceRecipes));
    setNotice("Shopping list generated.");
  }

  function addCustomShoppingItem() {
    const text = customShoppingItem.trim();

    if (!text) {
      return;
    }

    setShoppingItems((current) => [
      ...current,
      { id: crypto.randomUUID(), text, checked: false, count: 1 },
    ]);
    setCustomShoppingItem("");
  }

  function exportRecipes() {
    const data = {
      exported_at: now(),
      recipes,
      reviews,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creami-lab-backup-${getTodayInputDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importRecipes(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!requireAdmin("import recipes")) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as {
        recipes?: unknown[];
        reviews?: unknown[];
      };
      const importedRecipes = (parsed.recipes ?? []).map(normalizeRecipe);
      const importedReviews = (parsed.reviews ?? [])
        .map(normalizeReview)
        .filter((review) => review.rating > 0 && review.recipe_id);

      if (!importedRecipes.length) {
        setError("No recipes found in that JSON file.");
        return;
      }

      if (supabase) {
        const remotePayloads = importedRecipes.map((recipe) => {
          const payload = formToPayload(toForm(recipe));
          return {
            ...payload,
            id: recipe.id,
            created_at: recipe.created_at,
            slug: recipe.slug,
          };
        });
        const { data, error: importError } = await supabase
          .from("recipes")
          .upsert(remotePayloads, { onConflict: "id" })
          .select("*");

        if (importError) {
          throw importError;
        }

        setRecipes((current) =>
          sortRecipes([
            ...current.filter(
              (recipe) =>
                !importedRecipes.some((imported) => imported.id === recipe.id),
            ),
            ...((data ?? []) as unknown[]).map(normalizeRecipe),
          ]),
        );
      } else {
        setRecipes((current) =>
          sortRecipes([
            ...current.filter(
              (recipe) =>
                !importedRecipes.some((imported) => imported.id === recipe.id),
            ),
            ...importedRecipes,
          ]),
        );
      }

      setReviews((current) => {
        const importedIds = new Set(importedReviews.map((review) => review.id));
        return [
          ...importedReviews,
          ...current.filter((review) => !importedIds.has(review.id)),
        ];
      });
      setSelectedId(importedRecipes[0]?.id ?? selectedId);
      setNotice("Recipe JSON imported.");
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import failed. Check the JSON file.",
      );
    }
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
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <Link
                className="inline-flex h-9 items-center rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
                href="/"
              >
                Home
              </Link>
              <Link
                className="inline-flex h-9 items-center rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
                href="/standards"
              >
                Standards
              </Link>
              <Link
                className="inline-flex h-9 items-center rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
                href="/converter"
              >
                Converter
              </Link>
              <AdminLogin onSessionChange={setAdminSession} />
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
              {canManageRecipes ? (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-3 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
                  onClick={startNewRecipe}
                  title="Add recipe"
                  type="button"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add
                </button>
              ) : (
                <span className="rounded-md border border-[#3b463f] px-2 py-1 text-xs text-[var(--muted)]">
                  View mode
                </span>
              )}
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
                onChange={(event) =>
                  changeMajorCategoryFilter(
                    event.target.value as MajorCategorySlug | "all",
                  )
                }
                value={majorCategoryFilter}
              >
                <option value="all">All major categories</option>
                {MAJOR_CATEGORIES.map((major) => (
                  <option key={major.slug} value={major.slug}>
                    {major.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <select
                className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value as MinorCategorySlug | "all",
                  )
                }
                value={categoryFilter}
              >
                <option value="all">All minor categories</option>
                {filteredMinorCategories.map((minor) => (
                  <option key={minor.slug} value={minor.slug}>
                    {minor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
                <Star size={16} aria-hidden="true" />
                <select
                  className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                  onChange={(event) =>
                    setRatingFilter(event.target.value as RatingFilter)
                  }
                  value={ratingFilter}
                >
                  <option value="all">All ratings</option>
                  <option value="4+">4+ stars</option>
                  <option value="5">5 stars</option>
                </select>
              </label>
              <label className="flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)]">
                <BadgeCheck size={16} aria-hidden="true" />
                <select
                  className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  <option value="favorite">Favorites</option>
                  <option value="family-approved">Family approved</option>
                  <option value="tested">Tested</option>
                  <option value="experimental">Experimental</option>
                </select>
              </label>
              <label className="flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--muted)] sm:col-span-2 lg:col-span-1">
                <RefreshCw size={16} aria-hidden="true" />
                <select
                  className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none"
                  onChange={(event) => setSettingFilter(event.target.value)}
                  value={settingFilter}
                >
                  <option value="all">All Creami settings</option>
                  {allSettings.map((setting) => (
                    <option key={setting} value={setting}>
                      {setting}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <PintRulesPanel />

          <RecipeToolsPanel
            canImport={canManageRecipes}
            customItem={customShoppingItem}
            filteredRecipes={filteredRecipes}
            onAddCustomItem={addCustomShoppingItem}
            onCustomItemChange={setCustomShoppingItem}
            onExport={exportRecipes}
            onGenerateAll={() => generateShoppingList(recipes)}
            onGenerateFiltered={() => generateShoppingList(filteredRecipes)}
            onImport={importRecipes}
            onItemToggle={(id) =>
              setShoppingItems((current) =>
                current.map((item) =>
                  item.id === id ? { ...item, checked: !item.checked } : item,
                ),
              )
            }
            onRemoveChecked={() =>
              setShoppingItems((current) => current.filter((item) => !item.checked))
            }
            shoppingItems={shoppingItems}
          />

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                Loading recipes...
              </div>
            ) : filteredRecipes.length ? (
              filteredRecipes.map((recipe) => {
                const recipeReviews = reviewsForRecipe(reviews, recipe.id);
                const primaryPhoto = recipePrimaryPhoto(recipe);

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
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-[#28322d] bg-[#0b0e0d]">
                        {primaryPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={`${recipe.name} photo`}
                            className="h-full w-full object-cover"
                            src={primaryPhoto}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[var(--muted)]">
                            <ImagePlus size={20} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="truncate text-sm font-semibold">
                                {recipe.name}
                              </h3>
                              {recipe.version_label && (
                                <VersionBadge label={recipe.version_label} />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {minorCategoryText(recipe)} -{" "}
                              {recipe.program_used ||
                                recipe.spin_setting ||
                                recipe.creami_setting ||
                                "No setting"}
                            </p>
                          </div>
                          <VisitorRatingSummary
                            average={averageReviewRating(recipeReviews)}
                            compact
                            count={recipeReviews.length}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {recipe.favorite && (
                            <StatusBadge icon={<Heart size={11} />} text="Favorite" />
                          )}
                          {recipe.family_approved && (
                            <StatusBadge
                              icon={<BadgeCheck size={11} />}
                              text="Family approved"
                            />
                          )}
                          {!recipe.tested && <StatusBadge text="Needs testing" />}
                        </div>
                        {recipe.notes && (
                          <p className="mt-2 break-words text-xs leading-5 text-[#ddd9cf]">
                            {shortText(recipe.notes, 80)}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Last made: {formatOptionalDate(recipe.last_made)}
                        </p>
                        <TagRow tags={recipe.tags.slice(0, 4)} />
                      </div>
                    </div>
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
                  canManage={canManageRecipes}
                  onEdit={() => startEditing(creamiOfTheDay)}
                  onSelect={() => selectRecipe(creamiOfTheDay.id)}
                  recipe={creamiOfTheDay}
                />
              )}
              <RecipeDetail
                busy={busy}
                canManage={canManageRecipes}
                experimentForm={experimentForm}
                onDelete={() => deleteRecipe(selectedRecipe)}
                onDeleteReview={deleteReview}
                onDeleteExperiment={(experimentId) =>
                  deleteExperiment(selectedRecipe, experimentId)
                }
                onEdit={() => startEditing(selectedRecipe)}
                onCancelReviewEdit={cancelEditingReview}
                onExperimentChange={setExperimentForm}
                onExperimentSubmit={submitExperiment}
                onMakeAgain={() => markMadeAgain(selectedRecipe)}
                onNewVersion={() => startNewVersion(selectedRecipe)}
                onRemoveLabeledPhoto={(label) =>
                  removeLabeledPhoto(selectedRecipe, label)
                }
                onRemovePhoto={(stage) => removePhoto(selectedRecipe, stage)}
                onReviewChange={setReviewForm}
                onReviewEditChange={setReviewEditForm}
                onReviewEditSubmit={saveReviewEdit}
                onReviewSubmit={submitReview}
                onSelectVersion={selectRecipe}
                onStartReviewEdit={startEditingReview}
                onToggleApproved={() =>
                  toggleRecipeField(selectedRecipe, "family_approved")
                }
                onToggleFavorite={() =>
                  toggleRecipeField(selectedRecipe, "favorite")
                }
                onToggleTested={() =>
                  toggleRecipeField(selectedRecipe, "tested")
                }
                onToggleWouldMakeAgain={() =>
                  toggleRecipeField(selectedRecipe, "would_make_again")
                }
                onScaleChange={setScaleMultiplier}
                onUploadLabeledPhoto={(label, event) =>
                  uploadLabeledPhoto(selectedRecipe, label, event)
                }
                onUploadPhoto={(stage, event) =>
                  uploadPhoto(selectedRecipe, stage, event)
                }
                recipe={selectedRecipe}
                reviewAverage={selectedReviewAverage}
                reviewEditForm={reviewEditForm}
                reviewEditingId={editingReviewId}
                reviewForm={reviewForm}
                reviews={selectedReviews}
                scaleMultiplier={scaleMultiplier}
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
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canManageRecipes}
                onClick={startNewRecipe}
                type="button"
              >
                <Plus size={16} aria-hidden="true" />
                Add first recipe
              </button>
            </div>
          )}

          {editing && canManageRecipes && (
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

function PintRulesPanel() {
  return (
    <section className="min-w-0 rounded-md border border-[#39443e] bg-[#101411] p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--mint)]">
          <ListChecks size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted)]">
            Constant rules for every pint
          </p>
          <h2 className="text-base font-semibold">Our Rules</h2>
        </div>
      </div>

      <ol className="mt-3 space-y-2">
        {PINT_RULES.map((rule, index) => (
          <li className="flex min-w-0 gap-2 text-sm" key={rule}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#4b5136] text-[10px] font-semibold text-[var(--amber)]">
              {index + 1}
            </span>
            <span className="min-w-0 break-words leading-6 text-[var(--muted)]">
              {rule}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RecipeToolsPanel({
  canImport,
  customItem,
  filteredRecipes,
  onAddCustomItem,
  onCustomItemChange,
  onExport,
  onGenerateAll,
  onGenerateFiltered,
  onImport,
  onItemToggle,
  onRemoveChecked,
  shoppingItems,
}: {
  canImport: boolean;
  customItem: string;
  filteredRecipes: Recipe[];
  onAddCustomItem: () => void;
  onCustomItemChange: (value: string) => void;
  onExport: () => void;
  onGenerateAll: () => void;
  onGenerateFiltered: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onItemToggle: (id: string) => void;
  onRemoveChecked: () => void;
  shoppingItems: ShoppingItem[];
}) {
  return (
    <section className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <ShoppingBasket size={16} className="text-[var(--mint)]" />
        <h2 className="text-base font-semibold">Lab tools</h2>
      </div>
      <div className="grid gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
          onClick={onGenerateFiltered}
          type="button"
        >
          <ShoppingBasket size={15} aria-hidden="true" />
          Shop filtered ({filteredRecipes.length})
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
          onClick={onGenerateAll}
          type="button"
        >
          <ShoppingBasket size={15} aria-hidden="true" />
          Shop all recipes
        </button>
        <div className="flex min-w-0 gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
            onChange={(event) => onCustomItemChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddCustomItem();
              }
            }}
            placeholder="Custom item"
            value={customItem}
          />
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition hover:border-[var(--mint)]"
            onClick={onAddCustomItem}
            title="Add custom shopping item"
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        {shoppingItems.length > 0 && (
          <div className="space-y-2 rounded-md border border-[#28322d] bg-[#101411] p-3">
            {shoppingItems.slice(0, 8).map((item) => (
              <label
                className="flex min-w-0 items-start gap-2 text-sm"
                key={item.id}
              >
                <input
                  checked={item.checked}
                  className="mt-1"
                  onChange={() => onItemToggle(item.id)}
                  type="checkbox"
                />
                <span className="min-w-0 break-words">
                  {item.text}
                  {item.count > 1 && (
                    <span className="text-[var(--muted)]"> x{item.count}</span>
                  )}
                </span>
              </label>
            ))}
            {shoppingItems.length > 8 && (
              <p className="text-xs text-[var(--muted)]">
                {shoppingItems.length - 8} more items in this list.
              </p>
            )}
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--berry)]"
              onClick={onRemoveChecked}
              type="button"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear checked
            </button>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
            onClick={onExport}
            type="button"
          >
            <Download size={15} aria-hidden="true" />
            Export JSON
          </button>
          {canImport && (
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]">
              <Upload size={15} aria-hidden="true" />
              Import JSON
              <input
                accept="application/json"
                className="sr-only"
                onChange={onImport}
                type="file"
              />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#4b5136] px-2 py-1 text-[11px] font-medium text-[var(--amber)]">
      {icon}
      <span className="min-w-0 break-words">{text}</span>
    </span>
  );
}

function ToggleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm transition ${
        active
          ? "border-[#4b5136] bg-[#171912] text-[var(--amber)]"
          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--mint)] hover:text-[var(--foreground)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function KeyValueList({ values }: { values: [string, string][] }) {
  return (
    <dl className="grid gap-2">
      {values.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-xs text-[var(--muted)]">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScalingPanel({
  ingredients,
  multiplier,
  onChange,
}: {
  ingredients: string[];
  multiplier: string;
  onChange: (value: string) => void;
}) {
  const parsedMultiplier = Number(multiplier);
  const activeMultiplier =
    Number.isFinite(parsedMultiplier) && parsedMultiplier > 0
      ? parsedMultiplier
      : 1;

  return (
    <InfoPanel title="Scaling tool">
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        {["1", "2", "3"].map((value) => (
          <button
            className={`h-10 rounded-md border px-3 text-sm transition ${
              multiplier === value
                ? "border-[var(--mint)] bg-[#10201a] text-[var(--mint)]"
                : "border-[var(--line)] hover:border-[var(--mint)]"
            }`}
            key={value}
            onClick={() => onChange(value)}
            type="button"
          >
            {value} pint{value === "1" ? "" : "s"}
          </button>
        ))}
        <input
          className="h-10 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
          min="0.25"
          onChange={(event) => onChange(event.target.value)}
          step="0.25"
          type="number"
          value={multiplier}
        />
      </div>
      <ItemList
        items={ingredients.map((ingredient) =>
          scaleIngredient(ingredient, activeMultiplier),
        )}
      />
    </InfoPanel>
  );
}

function CreamiSettingsPanel({
  onEdit,
  recipe,
}: {
  onEdit?: () => void;
  recipe: Recipe;
}) {
  return (
    <InfoPanel onEdit={onEdit} title="Creami settings">
      <KeyValueList
        values={[
          ["Freeze time", recipe.freeze_time || "Not logged"],
          ["Program", recipe.program_used || recipe.creami_setting || "Not logged"],
          ["Spin setting", recipe.spin_setting || recipe.creami_setting || "Not logged"],
          ["Respins", String(recipe.respin_count)],
          ["Liquid added", recipe.respin_liquid || "None logged"],
          ["Liquid amount", recipe.respin_liquid_amount || "None logged"],
          ["Final texture", recipe.texture_result || "Not logged"],
          ["Spin notes", recipe.spin_notes || "No notes"],
        ]}
      />
      {recipe.respin_instructions && (
        <p className="mt-3">{recipe.respin_instructions}</p>
      )}
    </InfoPanel>
  );
}

function PhotoGalleryPanel({
  busy,
  canManage,
  onRemoveLabeledPhoto,
  onRemovePhoto,
  onUploadLabeledPhoto,
  onUploadPhoto,
  recipe,
}: {
  busy: string;
  canManage: boolean;
  onRemoveLabeledPhoto: (label: string) => void;
  onRemovePhoto: (stage: "before" | "after") => void;
  onUploadLabeledPhoto: (
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onUploadPhoto: (
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  recipe: Recipe;
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4 xl:col-span-2">
      <h3 className="mb-3 text-sm font-semibold text-[var(--mint)]">Photos</h3>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PhotoSlot
          busy={busy === `${recipe.id}-before` || busy === recipe.id}
          canManage={canManage}
          imageUrl={recipe.photo_before_url}
          label="Before spin"
          onRemove={() => onRemovePhoto("before")}
          onUpload={(event) => onUploadPhoto("before", event)}
        />
        <PhotoSlot
          busy={busy === `${recipe.id}-after` || busy === recipe.id}
          canManage={canManage}
          imageUrl={recipe.photo_after_url}
          label="After spin"
          onRemove={() => onRemovePhoto("after")}
          onUpload={(event) => onUploadPhoto("after", event)}
        />
        {PHOTO_LABELS.map((label) => {
          const photo = recipe.photos.find((item) => item.label === label);

          return (
            <PhotoSlot
              busy={busy === `${recipe.id}-${label}` || busy === recipe.id}
              canManage={canManage}
              imageUrl={photo?.url ?? null}
              key={label}
              label={label}
              onRemove={() => onRemoveLabeledPhoto(label)}
              onUpload={(event) => onUploadLabeledPhoto(label, event)}
            />
          );
        })}
      </div>
    </article>
  );
}

function ExperimentPanel({
  busy,
  canManage,
  form,
  onChange,
  onDelete,
  onSubmit,
  recipe,
}: {
  busy: boolean;
  canManage: boolean;
  form: ExperimentForm;
  onChange: (form: ExperimentForm) => void;
  onDelete: (experimentId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  recipe: Recipe;
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4 xl:col-span-2">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <FlaskConical size={16} className="text-[var(--mint)]" />
        <h3 className="text-sm font-semibold text-[var(--mint)]">
          Experiment log
        </h3>
      </div>
      {canManage && (
        <form
          className="grid min-w-0 gap-3 rounded-md border border-[#28322d] bg-[#101411] p-3 md:grid-cols-2"
          onSubmit={onSubmit}
        >
          <Field label="Date">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, date: event.target.value })
              }
              type="date"
              value={form.date}
            />
          </Field>
          <Field label="What changed">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, what_changed: event.target.value })
              }
              value={form.what_changed}
            />
          </Field>
          <Field label="Why I changed it">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, why_changed: event.target.value })
              }
              value={form.why_changed}
            />
          </Field>
          <Field label="Result">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, result: event.target.value })
              }
              value={form.result}
            />
          </Field>
          <Field label="Texture notes">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, texture_notes: event.target.value })
              }
              value={form.texture_notes}
            />
          </Field>
          <Field label="Flavor notes">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, flavor_notes: event.target.value })
              }
              value={form.flavor_notes}
            />
          </Field>
          <Field label="Sweetness notes">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, sweetness_notes: event.target.value })
              }
              value={form.sweetness_notes}
            />
          </Field>
          <Field label="Family reaction">
            <input
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
              onChange={(event) =>
                onChange({ ...form, family_reaction: event.target.value })
              }
              value={form.family_reaction}
            />
          </Field>
          <label className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
            <input
              checked={form.would_repeat}
              onChange={(event) =>
                onChange({ ...form, would_repeat: event.target.checked })
              }
              type="checkbox"
            />
            Would repeat this change
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            <Plus size={16} aria-hidden="true" />
            Save experiment
          </button>
        </form>
      )}
      <div className="mt-4 space-y-3">
        {recipe.experiments.length ? (
          recipe.experiments.map((experiment) => (
            <article
              className="rounded-md border border-[#28322d] bg-[#101411] p-3"
              key={experiment.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold">
                    {experiment.what_changed || "Experiment"}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {experiment.date || "No date"}
                  </p>
                </div>
                {canManage && (
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--berry)] hover:text-[#ffd5dc]"
                    onClick={() => onDelete(experiment.id)}
                    title="Remove experiment"
                    type="button"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-3 break-words text-sm leading-6">
                {experiment.result || "No result logged."}
              </p>
              {(experiment.why_changed ||
                experiment.texture_notes ||
                experiment.flavor_notes ||
                experiment.sweetness_notes ||
                experiment.family_reaction) && (
                <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] md:grid-cols-2">
                  {experiment.why_changed && <span>Why: {experiment.why_changed}</span>}
                  {experiment.texture_notes && <span>Texture: {experiment.texture_notes}</span>}
                  {experiment.flavor_notes && <span>Flavor: {experiment.flavor_notes}</span>}
                  {experiment.sweetness_notes && <span>Sweetness: {experiment.sweetness_notes}</span>}
                  {experiment.family_reaction && <span>Family: {experiment.family_reaction}</span>}
                  <span>{experiment.would_repeat ? "Would repeat" : "Would not repeat yet"}</span>
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="rounded-md border border-[#28322d] bg-[#101411] p-3 text-sm text-[var(--muted)]">
            No experiments logged yet.
          </p>
        )}
      </div>
    </article>
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
  canManage,
  onEdit,
  onSelect,
  recipe,
}: {
  canManage: boolean;
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
          {canManage && (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-3 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
              onClick={onEdit}
              type="button"
            >
              <Edit3 size={16} aria-hidden="true" />
              Edit
            </button>
          )}
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
  canManage,
  experimentForm,
  onDelete,
  onDeleteExperiment,
  onDeleteReview,
  onEdit,
  onCancelReviewEdit,
  onExperimentChange,
  onExperimentSubmit,
  onMakeAgain,
  onNewVersion,
  onRemoveLabeledPhoto,
  onRemovePhoto,
  onReviewChange,
  onReviewEditChange,
  onReviewEditSubmit,
  onReviewSubmit,
  onScaleChange,
  onSelectVersion,
  onToggleApproved,
  onToggleFavorite,
  onToggleTested,
  onToggleWouldMakeAgain,
  onStartReviewEdit,
  onUploadLabeledPhoto,
  onUploadPhoto,
  recipe,
  reviewAverage,
  reviewEditForm,
  reviewEditingId,
  reviewForm,
  reviews,
  scaleMultiplier,
  versionRecipes,
}: {
  busy: string;
  canManage: boolean;
  experimentForm: ExperimentForm;
  onDelete: () => void;
  onDeleteExperiment: (experimentId: string) => void;
  onDeleteReview: (review: RecipeReview) => void;
  onEdit: () => void;
  onCancelReviewEdit: () => void;
  onExperimentChange: (form: ExperimentForm) => void;
  onExperimentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMakeAgain: () => void;
  onNewVersion: () => void;
  onRemoveLabeledPhoto: (label: string) => void;
  onRemovePhoto: (stage: "before" | "after") => void;
  onReviewChange: (form: ReviewForm) => void;
  onReviewEditChange: (form: ReviewForm) => void;
  onReviewEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onScaleChange: (value: string) => void;
  onSelectVersion: (recipeId: string) => void;
  onToggleApproved: () => void;
  onToggleFavorite: () => void;
  onToggleTested: () => void;
  onToggleWouldMakeAgain: () => void;
  onStartReviewEdit: (review: RecipeReview) => void;
  onUploadLabeledPhoto: (
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onUploadPhoto: (
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  recipe: Recipe;
  reviewAverage: number | null;
  reviewEditForm: ReviewForm;
  reviewEditingId: string;
  reviewForm: ReviewForm;
  reviews: RecipeReview[];
  scaleMultiplier: string;
  versionRecipes: Recipe[];
}) {
  const deletingReviewId = busy.startsWith("review-delete:")
    ? busy.slice("review-delete:".length)
    : "";
  const primaryPhoto = recipePrimaryPhoto(recipe);

  return (
    <div className="space-y-5">
      <div className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-md border border-[#28322d] bg-[#0b0e0d]">
            {primaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${recipe.name} photo`}
                className="h-full w-full object-cover"
                src={primaryPhoto}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[var(--muted)]">
                <ImagePlus size={28} aria-hidden="true" />
                <span>No recipe image yet</span>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">{categoryText(recipe)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-2xl font-semibold tracking-normal sm:text-3xl">
                  {recipe.name}
                </h2>
                {recipe.version_label && (
                  <VersionBadge label={recipe.version_label} />
                )}
                {recipe.family_approved && (
                  <StatusBadge
                    icon={<BadgeCheck size={12} />}
                    text="Family approved"
                  />
                )}
                {recipe.favorite && (
                  <StatusBadge icon={<Heart size={12} />} text="Favorite" />
                )}
              </div>
              {recipe.description && (
                <p className="mt-3 break-words text-sm leading-6 text-[#ddd9cf]">
                  {recipe.description}
                </p>
              )}
              <TagRow tags={recipe.tags} />
            </div>

            <div className="grid min-w-0 gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
              <span>Program: {recipe.program_used || recipe.creami_setting || "Not logged"}</span>
              <span>Last made: {formatOptionalDate(recipe.last_made)}</span>
              <span>Version: {versionSummary(recipe)}</span>
              <span>Yield: {recipe.serving_size || "Not logged"}</span>
              <span>
                Rating:{" "}
                {reviewAverage === null
                  ? "No reviews"
                  : `${formatRatingValue(reviewAverage)}/5 (${reviews.length})`}
              </span>
              <span>
                Personal:{" "}
                {recipe.personal_rating ? `${recipe.personal_rating}/5` : "Not rated"}
              </span>
            </div>

            {canManage && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--amber)] sm:flex-none"
                    onClick={onNewVersion}
                    title="Duplicate as a new version"
                    type="button"
                  >
                    <Copy size={16} aria-hidden="true" />
                    Duplicate version
                  </button>
                  <button
                    className="inline-flex h-10 min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)] sm:flex-none"
                    onClick={onMakeAgain}
                    title="Mark made today"
                    type="button"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    Make again
                  </button>
                  <button
                    className="inline-flex h-10 min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)] sm:flex-none"
                    onClick={onEdit}
                    title="Edit recipe"
                    type="button"
                  >
                    <Edit3 size={16} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    className="inline-flex h-10 min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#5c353a] px-3 text-sm text-[#ffd5dc] transition hover:border-[var(--berry)] sm:flex-none"
                    onClick={onDelete}
                    title="Delete recipe"
                    type="button"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleButton
                    active={recipe.favorite}
                    icon={<Heart size={15} />}
                    label="Favorite"
                    onClick={onToggleFavorite}
                  />
                  <ToggleButton
                    active={recipe.family_approved}
                    icon={<BadgeCheck size={15} />}
                    label="Family approved"
                    onClick={onToggleApproved}
                  />
                  <ToggleButton
                    active={recipe.tested}
                    icon={<FlaskConical size={15} />}
                    label="Tested"
                    onClick={onToggleTested}
                  />
                  <ToggleButton
                    active={recipe.would_make_again}
                    icon={<RefreshCw size={15} />}
                    label="Would make again"
                    onClick={onToggleWouldMakeAgain}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Ingredients">
          <ItemList items={recipe.ingredients} />
        </InfoPanel>
        <ScalingPanel
          ingredients={recipe.ingredients}
          multiplier={scaleMultiplier}
          onChange={onScaleChange}
        />
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Instructions">
          <StepList items={recipe.instructions} />
        </InfoPanel>
        <CreamiSettingsPanel
          onEdit={canManage ? onEdit : undefined}
          recipe={recipe}
        />
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Mix-ins">
          <p>{recipe.mix_ins || "No mix-ins logged."}</p>
          {recipe.mix_in_amount && (
            <p className="mt-2 text-[var(--muted)]">Amount: {recipe.mix_in_amount}</p>
          )}
          {recipe.mix_in_timing && (
            <p className="mt-1 text-[var(--muted)]">Timing: {recipe.mix_in_timing}</p>
          )}
          {recipe.mix_in_instructions && (
            <p className="mt-2">{recipe.mix_in_instructions}</p>
          )}
        </InfoPanel>
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Testing results">
          <KeyValueList
            values={[
              ["Difficulty", recipe.difficulty || "Not logged"],
              ["Texture", recipe.texture_result || "Not logged"],
              ["Sweetness", recipe.sweetness_result || "Not logged"],
              ["Flavor strength", recipe.flavor_strength_result || "Not logged"],
              ["Source", recipe.source_origin || "Not logged"],
            ]}
          />
        </InfoPanel>
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Recipe versions">
          <VersionList
            currentRecipeId={recipe.id}
            onSelect={onSelectVersion}
            recipes={versionRecipes}
          />
        </InfoPanel>
        <InfoPanel onEdit={canManage ? onEdit : undefined} title="Notes">
          <p>{recipe.notes || "No notes yet."}</p>
        </InfoPanel>
        <PhotoGalleryPanel
          busy={busy}
          canManage={canManage}
          onRemoveLabeledPhoto={onRemoveLabeledPhoto}
          onRemovePhoto={onRemovePhoto}
          onUploadLabeledPhoto={onUploadLabeledPhoto}
          onUploadPhoto={onUploadPhoto}
          recipe={recipe}
        />
        <ExperimentPanel
          busy={busy === recipe.id}
          canManage={canManage}
          form={experimentForm}
          onChange={onExperimentChange}
          onDelete={onDeleteExperiment}
          onSubmit={onExperimentSubmit}
          recipe={recipe}
        />
        <ReviewPanel
          busy={busy === "review"}
          deletingReviewId={deletingReviewId}
          editingReviewId={reviewEditingId}
          editForm={reviewEditForm}
          form={reviewForm}
          isEditingBusy={busy === `review-edit:${reviewEditingId}`}
          onCancelEdit={onCancelReviewEdit}
          onChange={onReviewChange}
          onDeleteReview={onDeleteReview}
          onEditChange={onReviewEditChange}
          onEditSubmit={onReviewEditSubmit}
          onSubmit={onReviewSubmit}
          onStartEdit={onStartReviewEdit}
          reviewAverage={reviewAverage}
          reviews={reviews}
        />
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
  editingReviewId,
  editForm,
  form,
  isEditingBusy,
  onCancelEdit,
  onChange,
  onDeleteReview,
  onEditChange,
  onEditSubmit,
  onStartEdit,
  onSubmit,
  reviewAverage,
  reviews,
}: {
  busy: boolean;
  deletingReviewId: string;
  editingReviewId: string;
  editForm: ReviewForm;
  form: ReviewForm;
  isEditingBusy: boolean;
  onCancelEdit: () => void;
  onChange: (form: ReviewForm) => void;
  onDeleteReview: (review: RecipeReview) => void;
  onEditChange: (form: ReviewForm) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStartEdit: (review: RecipeReview) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reviewAverage: number | null;
  reviews: RecipeReview[];
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--mint)]">
            Family feedback
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {reviewAverage === null
              ? "No family average yet"
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
          <label className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)] md:col-span-2">
            <input
              checked={form.would_eat_again}
              onChange={(event) =>
                onChange({ ...form, would_eat_again: event.target.checked })
              }
              type="checkbox"
            />
            Would eat again
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
          reviews.map((review) => {
            const isEditing = editingReviewId === review.id;

            return (
              <article
                className="min-w-0 rounded-md border border-[#28322d] bg-[#101411] p-3"
                key={review.id}
              >
                {isEditing ? (
                  <form className="grid gap-3" onSubmit={onEditSubmit}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-[var(--muted)]">
                          Name
                        </span>
                        <input
                          className="h-10 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
                          onChange={(event) =>
                            onEditChange({
                              ...editForm,
                              reviewer_name: event.target.value,
                            })
                          }
                          value={editForm.reviewer_name}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-[var(--muted)]">
                          Rating
                        </span>
                        <div className="flex min-h-10 min-w-0 items-center overflow-x-auto rounded-md border border-[var(--line)] bg-[#0f1311] px-1">
                          <StarRatingControl
                            disabled={isEditingBusy}
                            onRate={(rating) =>
                              onEditChange({
                                ...editForm,
                                rating: String(rating),
                              })
                            }
                            value={normalizeRating(editForm.rating)}
                          />
                        </div>
                      </label>
                    </div>
                    <label className="space-y-2">
                      <span className="block text-sm font-medium text-[var(--muted)]">
                        Notes
                      </span>
                      <textarea
                        className="min-h-20 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
                        onChange={(event) =>
                          onEditChange({ ...editForm, notes: event.target.value })
                        }
                        value={editForm.notes}
                      />
                    </label>
                    <label className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
                      <input
                        checked={editForm.would_eat_again}
                        onChange={(event) =>
                          onEditChange({
                            ...editForm,
                            would_eat_again: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      Would eat again
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--mint)] px-3 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:opacity-60"
                        disabled={isEditingBusy}
                        type="submit"
                      >
                        <Check size={14} aria-hidden="true" />
                        {isEditingBusy ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--berry)]"
                        onClick={onCancelEdit}
                        type="button"
                      >
                        <X size={14} aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
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
                        {review.would_eat_again && (
                          <StatusBadge text="Would eat again" />
                        )}
                        <Rating value={review.rating} compact />
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--mint)] hover:text-[var(--foreground)]"
                          onClick={() => onStartEdit(review)}
                          title="Edit review"
                          type="button"
                        >
                          <Edit3 size={14} aria-hidden="true" />
                          <span className="sr-only">Edit review</span>
                        </button>
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
                  </>
                )}
              </article>
            );
          })
        ) : (
          <p className="rounded-md border border-[#28322d] bg-[#101411] p-3 text-sm text-[var(--muted)]">
            No family feedback yet.
          </p>
        )}
      </div>
    </article>
  );
}

function PhotoSlot({
  busy,
  canManage,
  imageUrl,
  label,
  onRemove,
  onUpload,
}: {
  busy: boolean;
  canManage: boolean;
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
        {imageUrl && canManage && (
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

      {canManage && (
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
      )}
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

  const editorMinorCategories = minorCategoriesForMajor(form.major_category_slug);

  function updateMajorCategory(majorSlug: MajorCategorySlug) {
    onChange({
      ...form,
      major_category_slug: majorSlug,
      minor_category_slug: firstMinorForMajor(majorSlug),
    });
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
        <Field label="Description">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("description", event.target.value)}
            placeholder="What this pint is trying to be..."
            value={form.description}
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
        <Field label="Version number">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            min="1"
            onChange={(event) => update("version_number", event.target.value)}
            type="number"
            value={form.version_number}
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
        <Field label="Major Category">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              updateMajorCategory(event.target.value as MajorCategorySlug)
            }
            value={form.major_category_slug}
          >
            {MAJOR_CATEGORIES.map((major) => (
              <option key={major.slug} value={major.slug}>
                {major.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minor Category">
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
            {editorMinorCategories.map((minor) => (
              <option key={minor.slug} value={minor.slug}>
                {minor.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prep time">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("prep_time", event.target.value)}
            placeholder="10 minutes"
            value={form.prep_time}
          />
        </Field>
        <Field label="Freeze time">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("freeze_time", event.target.value)}
            placeholder="18-24 hours"
            value={form.freeze_time}
          />
        </Field>
        <Field label="Serving size / yield">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("serving_size", event.target.value)}
            placeholder="1 pint"
            value={form.serving_size}
          />
        </Field>
        <Field label="Program used">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("program_used", event.target.value)}
            value={form.program_used}
          >
            <option value="">Choose program</option>
            {CREAMI_PROGRAMS.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Spin setting">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("spin_setting", event.target.value)}
            placeholder="Ice Cream, Gelato, Respin, Mix-In"
            value={form.spin_setting}
          />
        </Field>
        <Field label="Legacy Creami setting text">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("creami_setting", event.target.value)
            }
            placeholder="Ice Cream, Gelato, Respin, Mix-In"
            value={form.creami_setting}
          />
        </Field>
        <Field label="Number of respins">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            min="0"
            onChange={(event) => update("respin_count", event.target.value)}
            type="number"
            value={form.respin_count}
          />
        </Field>
        <Field label="Liquid added during respin">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("respin_liquid", event.target.value)}
            placeholder="whole milk"
            value={form.respin_liquid}
          />
        </Field>
        <Field label="Amount of liquid added">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("respin_liquid_amount", event.target.value)
            }
            placeholder="1 tbsp"
            value={form.respin_liquid_amount}
          />
        </Field>
        <Field label="Respin instructions">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) =>
              update("respin_instructions", event.target.value)
            }
            value={form.respin_instructions}
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
        <Field label="Mix-in amount">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("mix_in_amount", event.target.value)}
            placeholder="4 tbsp"
            value={form.mix_in_amount}
          />
        </Field>
        <Field label="Mix-in timing">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("mix_in_timing", event.target.value)}
            value={form.mix_in_timing}
          >
            <option value="">Choose timing</option>
            {MIX_IN_TIMINGS.map((timing) => (
              <option key={timing} value={timing}>
                {timing}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mix-in instructions">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) =>
              update("mix_in_instructions", event.target.value)
            }
            value={form.mix_in_instructions}
          />
        </Field>
        <Field label="Personal rating">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("personal_rating", event.target.value)}
            value={form.personal_rating}
          >
            <option value="">Not rated</option>
            {STAR_VALUES.map((rating) => (
              <option key={rating} value={rating}>
                {rating} star{rating === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("difficulty", event.target.value)}
            value={form.difficulty}
          >
            <option value="">Choose difficulty</option>
            {DIFFICULTY_LEVELS.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Texture result">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("texture_result", event.target.value)}
            value={form.texture_result}
          >
            <option value="">Choose texture</option>
            {TEXTURE_RESULTS.map((texture) => (
              <option key={texture} value={texture}>
                {texture}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sweetness result">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("sweetness_result", event.target.value)}
            value={form.sweetness_result}
          >
            <option value="">Choose sweetness</option>
            {RESULT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Flavor strength result">
          <select
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("flavor_strength_result", event.target.value)
            }
            value={form.flavor_strength_result}
          >
            <option value="">Choose flavor strength</option>
            {RESULT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes after spinning">
          <textarea
            className="min-h-24 w-full min-w-0 resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("spin_notes", event.target.value)}
            value={form.spin_notes}
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
        <Field label="Source / origin">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) => update("source_origin", event.target.value)}
            placeholder="Family idea, Ninja inspired, store-bought inspired"
            value={form.source_origin}
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
        <div className="min-w-0 rounded-md border border-[#28322d] bg-[#101411] p-3 lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-[var(--muted)]">
            Quick tags
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => {
              const currentTags = normalizeTags(form.tagsText);
              const active = currentTags.includes(tag);

              return (
                <button
                  className={`rounded-md border px-2 py-1 text-xs transition ${
                    active
                      ? "border-[#4b5136] text-[var(--amber)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--mint)]"
                  }`}
                  key={tag}
                  onClick={() => {
                    const nextTags = active
                      ? currentTags.filter((item) => item !== tag)
                      : [...currentTags, tag];
                    update("tagsText", nextTags.join(", "));
                  }}
                  type="button"
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid min-w-0 gap-3 rounded-md border border-[#28322d] bg-[#101411] p-3 lg:col-span-2 sm:grid-cols-2">
          {[
            ["favorite", "Favorite"],
            ["family_approved", "Family approved"],
            ["tested", "Tested"],
            ["would_make_again", "Would make again"],
          ].map(([key, label]) => (
            <label
              className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]"
              key={key}
            >
              <input
                checked={Boolean(form[key as keyof RecipeForm])}
                onChange={(event) =>
                  update(
                    key as keyof RecipeForm,
                    event.target.checked as RecipeForm[keyof RecipeForm],
                  )
                }
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>
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
