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

type Recipe = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  ingredients: string;
  instructions: string;
  creami_setting: string;
  mix_ins: string;
  family_rating: number;
  notes: string;
  tags: string[];
  photo_before_url: string | null;
  photo_before_path: string | null;
  photo_after_url: string | null;
  photo_after_path: string | null;
};

type RecipeForm = {
  id?: string;
  name: string;
  ingredients: string;
  instructions: string;
  creami_setting: string;
  mix_ins: string;
  family_rating: number;
  notes: string;
  tagsText: string;
  photo_before_url: string;
  photo_before_path: string;
  photo_after_url: string;
  photo_after_path: string;
};

const now = () => new Date().toISOString();

const demoRecipes: Recipe[] = [
  {
    id: "demo-mango-kulfi",
    created_at: now(),
    updated_at: now(),
    name: "Mango Kulfi Lab Pint",
    ingredients:
      "1 can evaporated milk\n1 cup mango puree\n2 tbsp condensed milk\n1 tbsp pistachio paste\n1/4 tsp cardamom\nPinch of salt",
    instructions:
      "Whisk until smooth.\nFreeze in a level pint for 24 hours.\nSpin once on Lite Ice Cream.\nAdd a splash of milk and re-spin if crumbly.",
    creami_setting: "Lite Ice Cream, then Re-Spin",
    mix_ins: "Crushed pistachios after first spin",
    family_rating: 5,
    notes: 'Dad said tastes like real kulfi.',
    tags: ["mango", "kulfi", "pistachio", "family favorite"],
    photo_before_url: "/demo-mango-before.png",
    photo_before_path: null,
    photo_after_url: "/demo-mango-after.png",
    photo_after_path: null,
  },
  {
    id: "demo-fudge-swirl",
    created_at: now(),
    updated_at: now(),
    name: "Chocolate Fudge Swirl",
    ingredients:
      "1 cup Fairlife chocolate milk\n1 scoop chocolate protein powder\n1 tbsp cocoa powder\n1 tbsp cream cheese\n1 tsp vanilla",
    instructions:
      "Blend until glossy.\nFreeze flat.\nSpin on Ice Cream.\nMake a center well, add fudge, then Mix-In.",
    creami_setting: "Ice Cream, then Mix-In",
    mix_ins: "Warm fudge ribbon and mini chocolate chips",
    family_rating: 4,
    notes: "Richer after sitting for five minutes.",
    tags: ["chocolate", "fudge swirl", "gelato"],
    photo_before_url: "/demo-fudge-before.png",
    photo_before_path: null,
    photo_after_url: "/demo-fudge-after.png",
    photo_after_path: null,
  },
];

const emptyForm: RecipeForm = {
  name: "",
  ingredients: "",
  instructions: "",
  creami_setting: "",
  mix_ins: "",
  family_rating: 0,
  notes: "",
  tagsText: "",
  photo_before_url: "",
  photo_before_path: "",
  photo_after_url: "",
  photo_after_path: "",
};

function normalizeTags(tagsText: string) {
  return tagsText
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

function toForm(recipe: Recipe): RecipeForm {
  return {
    id: recipe.id,
    name: recipe.name,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    creami_setting: recipe.creami_setting,
    mix_ins: recipe.mix_ins,
    family_rating: recipe.family_rating,
    notes: recipe.notes,
    tagsText: recipe.tags.join(", "),
    photo_before_url: recipe.photo_before_url ?? "",
    photo_before_path: recipe.photo_before_path ?? "",
    photo_after_url: recipe.photo_after_url ?? "",
    photo_after_path: recipe.photo_after_path ?? "",
  };
}

function formToPayload(form: RecipeForm) {
  return {
    name: form.name.trim() || "Untitled pint",
    ingredients: form.ingredients.trim(),
    instructions: form.instructions.trim(),
    creami_setting: form.creami_setting.trim(),
    mix_ins: form.mix_ins.trim(),
    family_rating: Number(form.family_rating) || 0,
    notes: form.notes.trim(),
    tags: normalizeTags(form.tagsText),
    photo_before_url: form.photo_before_url.trim() || null,
    photo_before_path: form.photo_before_path.trim() || null,
    photo_after_url: form.photo_after_url.trim() || null,
    photo_after_path: form.photo_after_path.trim() || null,
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

export default function Home() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<RecipeForm | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0] ?? null;

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
      const matchesQuery =
        !normalizedQuery ||
        [
          recipe.name,
          recipe.ingredients,
          recipe.instructions,
          recipe.creami_setting,
          recipe.mix_ins,
          recipe.notes,
          recipe.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesTag =
        tagFilter === "all" || recipe.tags.includes(tagFilter);

      return matchesQuery && matchesTag;
    });
  }, [query, recipes, tagFilter]);

  const averageRating = recipes.length
    ? recipes.reduce((sum, recipe) => sum + recipe.family_rating, 0) /
      recipes.length
    : 0;

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      setIsLoading(true);
      setError("");

      if (!supabase) {
        const stored = window.localStorage.getItem("creami-lab-recipes");
        const localRecipes = stored
          ? (JSON.parse(stored) as Recipe[])
          : demoRecipes;

        if (isMounted) {
          setRecipes(localRecipes);
          setSelectedId(localRecipes[0]?.id ?? "");
          setIsLoading(false);
        }

        return;
      }

      const { data, error: loadError } = await supabase
        .from("recipes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setRecipes([]);
      } else {
        const remoteRecipes = (data ?? []) as Recipe[];
        setRecipes(remoteRecipes);
        setSelectedId(remoteRecipes[0]?.id ?? "");
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
      window.localStorage.setItem("creami-lab-recipes", JSON.stringify(recipes));
    }
  }, [recipes, supabase]);

  function startNewRecipe() {
    setEditing({
      ...emptyForm,
      name: "New Creami Pint",
      tagsText: "mango, gelato",
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
        return exists
          ? current.map((recipe) =>
              recipe.id === savedRecipe.id ? savedRecipe : recipe,
            )
          : [savedRecipe, ...current];
      });
      setSelectedId(savedRecipe.id);
      setEditing(null);
      setNotice("Saved locally.");
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

    const savedRecipe = data as Recipe;
    setRecipes((current) => {
      const exists = current.some((recipe) => recipe.id === savedRecipe.id);
      return exists
        ? current.map((recipe) =>
            recipe.id === savedRecipe.id ? savedRecipe : recipe,
          )
        : [savedRecipe, ...current];
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
        current.map((recipe) =>
          recipe.id === recipeId
            ? { ...recipe, ...fields, updated_at: now() }
            : recipe,
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

    const updatedRecipe = data as Recipe;
    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe,
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
              Family-rated Ninja Creami recipes, spin settings, notes, tags,
              and before/after photos in one quiet workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-[420px]">
            <Metric label="Recipes" value={String(recipes.length)} />
            <Metric label="Avg rating" value={averageRating.toFixed(1)} />
            <Metric label="Tags" value={String(allTags.length)} />
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
                placeholder="Search mango, kulfi, fudge..."
                value={query}
              />
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
                      <h3 className="truncate text-sm font-semibold">
                        {recipe.name}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {recipe.creami_setting || "No setting yet"} ·{" "}
                        {formatDate(recipe.updated_at)}
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
              {error || notice || "Demo mode: add Supabase env vars to persist online."}
            </div>
          )}

          {selectedRecipe ? (
            <RecipeDetail
              busy={busy}
              onDelete={() => deleteRecipe(selectedRecipe)}
              onEdit={() => startEditing(selectedRecipe)}
              onRemovePhoto={(stage) => removePhoto(selectedRecipe, stage)}
              onUploadPhoto={(stage, event) =>
                uploadPhoto(selectedRecipe, stage, event)
              }
              recipe={selectedRecipe}
            />
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

function Rating({ value, compact = false }: { value: number; compact?: boolean }) {
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
  onRemovePhoto,
  onUploadPhoto,
  recipe,
}: {
  busy: string;
  onDelete: () => void;
  onEdit: () => void;
  onRemovePhoto: (stage: "before" | "after") => void;
  onUploadPhoto: (
    stage: "before" | "after",
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  recipe: Recipe;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex flex-col gap-5 xl:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[var(--muted)]">
                  Updated {formatDate(recipe.updated_at)}
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-normal">
                  {recipe.name}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
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
            <Rating value={recipe.family_rating} />
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
          <LineBreakText value={recipe.ingredients} />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Instructions">
          <LineBreakText value={recipe.instructions} />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Creami setting used">
          <p>{recipe.creami_setting || "Not logged yet."}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Mix-ins">
          <p>{recipe.mix_ins || "No mix-ins logged."}</p>
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Family rating">
          <Rating value={recipe.family_rating} />
        </InfoPanel>
        <InfoPanel onEdit={onEdit} title="Notes">
          <LineBreakText value={recipe.notes || "No notes yet."} />
        </InfoPanel>
      </div>
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
            <span>{label}</span>
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

function LineBreakText({ value }: { value: string }) {
  return (
    <div className="space-y-1">
      {value.split("\n").map((line, index) => (
        <p key={`${line}-${index}`}>{line || "\u00a0"}</p>
      ))}
    </div>
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
          <h2 className="text-2xl font-semibold">
            {form.id ? form.name : "New Creami Pint"}
          </h2>
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
        <Field label="Creami setting used">
          <input
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
            onChange={(event) =>
              update("creami_setting", event.target.value)
            }
            placeholder="Lite Ice Cream, Re-Spin, Mix-In"
            value={form.creami_setting}
          />
        </Field>
        <Field label="Ingredients">
          <textarea
            className="min-h-36 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("ingredients", event.target.value)}
            value={form.ingredients}
          />
        </Field>
        <Field label="Instructions">
          <textarea
            className="min-h-36 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6 text-[var(--foreground)]"
            onChange={(event) => update("instructions", event.target.value)}
            value={form.instructions}
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
        <Field label="Rating from family">
          <div className="flex h-11 items-center gap-3 rounded-md border border-[var(--line)] bg-[#0f1311] px-3">
            <input
              className="w-full accent-[var(--amber)]"
              max={5}
              min={0}
              onChange={(event) =>
                update("family_rating", Number(event.target.value))
              }
              type="range"
              value={form.family_rating}
            />
            <span className="w-10 text-right text-sm tabular-nums">
              {form.family_rating}/5
            </span>
          </div>
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
