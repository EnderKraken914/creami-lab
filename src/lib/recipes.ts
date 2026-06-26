export type MajorCategorySlug = "scoop" | "soft-serve-swirl";

export type MinorCategorySlug =
  | "ice-cream"
  | "gelato"
  | "kulfi"
  | "sorbet"
  | "sherbet"
  | "italian-ice"
  | "fruit-whip"
  | "frozen-yogurt"
  | "frozen-custard"
  | "milkshake"
  | "creamifit"
  | "lite-ice-cream";

export type MajorCategory = {
  slug: MajorCategorySlug;
  name: string;
};

export type MinorCategory = {
  slug: MinorCategorySlug;
  major_slug: MajorCategorySlug;
  name: string;
};

export type RecipePhoto = {
  id: string;
  label: string;
  url: string;
  path: string | null;
  created_at: string;
};

export type RecipeExperiment = {
  id: string;
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

export type Recipe = {
  id: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  version_group: string | null;
  version_label: string | null;
  version_number: number | null;
  version_notes: string;
  ingredients: string[];
  instructions: string[];
  creami_setting: string;
  prep_time: string;
  freeze_time: string;
  spin_setting: string;
  program_used: string;
  respin_count: number;
  respin_liquid: string;
  respin_liquid_amount: string;
  respin_instructions: string;
  mix_ins: string;
  mix_in_amount: string;
  mix_in_timing: string;
  mix_in_instructions: string;
  family_rating: number | null;
  personal_rating: number | null;
  notes: string;
  tags: string[];
  photo_before_url: string | null;
  photo_before_path: string | null;
  photo_after_url: string | null;
  photo_after_path: string | null;
  photos: RecipePhoto[];
  built_in: boolean;
  last_made: string | null;
  minor_category_slug: MinorCategorySlug | null;
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
};

export type RecipeReview = {
  id: string;
  recipe_id: string;
  created_at: string;
  reviewer_name: string;
  rating: number;
  notes: string;
  would_eat_again: boolean;
};

export const PHOTO_LABELS = [
  "Base before freezing",
  "Frozen pint",
  "After first spin",
  "After respin",
  "Final serving",
  "Family serving / plated dessert",
] as const;

export const CREAMI_PROGRAMS = [
  "Ice Cream",
  "Gelato",
  "Sorbet",
  "Lite Ice Cream",
  "Milkshake",
  "Mix-In",
  "CreamiFit",
  "Soft Serve",
] as const;

export const TEXTURE_RESULTS = [
  "Creamy",
  "Icy",
  "Crumbly",
  "Gummy",
  "Too soft",
  "Perfect",
] as const;

export const RESULT_LEVELS = [
  "Too low",
  "Mild",
  "Balanced",
  "Strong",
  "Too strong",
] as const;

export const DIFFICULTY_LEVELS = ["Easy", "Medium", "Project"] as const;

export const MIX_IN_TIMINGS = [
  "Before spinning",
  "After spinning",
  "After respin",
] as const;

export const SUGGESTED_TAGS = [
  "family approved",
  "dad favorite",
  "mom request",
  "fruit",
  "chocolate",
  "mango",
  "banana",
  "peach",
  "strawberry",
  "fudge swirl",
  "kulfi",
  "gelato",
  "no mix-ins",
  "halal",
  "tested",
  "needs testing",
  "store-bought inspired",
  "indian dessert",
  "banana split",
  "summer",
  "rich",
  "light",
  "creamy",
] as const;

export const DEFAULT_STANDARDS = [
  "Taste before freezing.",
  "Frozen desserts taste less sweet than the liquid base.",
  "Fruit bases should taste slightly stronger and sweeter before freezing.",
  "Standard xanthan gum amount: 1/4 tsp per pint unless testing otherwise.",
  "Use a pinch of salt to boost flavor.",
  "Chilled fudge works best for fudge streaks.",
  "Use Mix-In for ribbons/pockets, not perfect swirls.",
  "Label whether a recipe is tested or still experimental.",
] as const;

export const MAJOR_CATEGORIES: MajorCategory[] = [
  { slug: "scoop", name: "Scoop" },
  { slug: "soft-serve-swirl", name: "Soft Serve / Swirl" },
];

export const MINOR_CATEGORIES: MinorCategory[] = [
  { slug: "ice-cream", major_slug: "scoop", name: "Ice Cream" },
  { slug: "gelato", major_slug: "scoop", name: "Gelato" },
  { slug: "kulfi", major_slug: "scoop", name: "Kulfi" },
  { slug: "sorbet", major_slug: "scoop", name: "Sorbet" },
  { slug: "sherbet", major_slug: "scoop", name: "Sherbet" },
  { slug: "italian-ice", major_slug: "scoop", name: "Italian Ice" },
  { slug: "frozen-yogurt", major_slug: "scoop", name: "Frozen Yogurt" },
  { slug: "frozen-custard", major_slug: "scoop", name: "Frozen Custard" },
  { slug: "lite-ice-cream", major_slug: "scoop", name: "Lite Ice Cream" },
  { slug: "creamifit", major_slug: "soft-serve-swirl", name: "CreamiFit" },
  { slug: "fruit-whip", major_slug: "soft-serve-swirl", name: "Fruit Whip" },
  { slug: "milkshake", major_slug: "soft-serve-swirl", name: "Milkshake" },
];

const BUILT_IN_TIMESTAMP = "2026-06-25T00:00:00.000Z";

function builtInRecipe(
  recipe: Omit<
    Recipe,
    | "created_at"
    | "updated_at"
    | "description"
    | "version_group"
    | "version_label"
    | "version_number"
    | "version_notes"
    | "prep_time"
    | "freeze_time"
    | "spin_setting"
    | "program_used"
    | "respin_count"
    | "respin_liquid"
    | "respin_liquid_amount"
    | "respin_instructions"
    | "mix_in_amount"
    | "mix_in_timing"
    | "mix_in_instructions"
    | "personal_rating"
    | "photos"
    | "serving_size"
    | "source_origin"
    | "difficulty"
    | "texture_result"
    | "sweetness_result"
    | "flavor_strength_result"
    | "spin_notes"
    | "favorite"
    | "family_approved"
    | "tested"
    | "would_make_again"
    | "experiments"
  > &
    Partial<Pick<Recipe, "version_group" | "version_label" | "version_notes">>,
): Recipe {
  return {
    description: "",
    version_group: null,
    version_label: null,
    version_number: null,
    version_notes: "",
    prep_time: "",
    freeze_time: "18-24 hours",
    spin_setting: recipe.creami_setting,
    program_used: recipe.creami_setting.split(",")[0]?.trim() || "",
    respin_count: recipe.creami_setting.toLowerCase().includes("respin")
      ? 1
      : 0,
    respin_liquid: "",
    respin_liquid_amount: "",
    respin_instructions: "",
    mix_in_amount: "",
    mix_in_timing: recipe.mix_ins ? "After spinning" : "",
    mix_in_instructions: recipe.mix_ins ? "Run Mix-In once." : "",
    personal_rating: null,
    photos: [],
    serving_size: "1 pint",
    source_origin: "Creami Lab built-in",
    difficulty: "",
    texture_result: "",
    sweetness_result: "",
    flavor_strength_result: "",
    spin_notes: "",
    favorite: false,
    family_approved: recipe.tags.includes("family approved"),
    tested: recipe.tags.includes("tested"),
    would_make_again: false,
    experiments: [],
    ...recipe,
    created_at: BUILT_IN_TIMESTAMP,
    updated_at: BUILT_IN_TIMESTAMP,
  };
}

export const DEFAULT_RECIPES: Recipe[] = [
  builtInRecipe({
    id: "0b7f3bc4-8c76-4e8f-9fd1-3fbf20f08f62",
    slug: "banana-fudge-swirl-ice-cream",
    name: "Banana Fudge Swirl Ice Cream",
    version_group: "Banana Fudge Swirl",
    version_label: "v1",
    ingredients: [
      "3/4 cup + 1 tbsp heavy cream",
      "1 cup whole milk",
      "1 large ripe banana",
      "1/4 cup sugar",
      "1 tsp vanilla extract",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
      "4 tbsp chilled chocolate fudge, for mix-in",
    ],
    instructions: [
      "Blend cream, milk, banana, sugar, vanilla, salt, and xanthan gum until smooth.",
      "Taste and adjust.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "If crumbly, add 1 tbsp milk and Respin.",
      "Add chilled fudge.",
      "Run Mix-In once.",
    ],
    creami_setting: "Ice Cream, Respin if needed, Mix-In",
    mix_ins: "4 tbsp chilled chocolate fudge",
    family_rating: null,
    notes: "",
    tags: ["banana", "fudge swirl", "family approved"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "ice-cream",
  }),
  builtInRecipe({
    id: "7b32868f-eef7-4288-a036-8b0dd50e505a",
    slug: "alphonso-mango-ice-cream",
    name: "Alphonso Mango Ice Cream",
    version_group: "Alphonso Mango",
    version_label: "Ice Cream",
    ingredients: [
      "3/4 cup + 1 tbsp heavy cream",
      "1 cup whole milk",
      "1 1/2 cups Alphonso mango",
      "4 tbsp sugar",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
    ],
    instructions: [
      "Blend until smooth.",
      "Taste and adjust.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "Respin only if needed.",
    ],
    creami_setting: "Ice Cream, Respin if needed",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["mango", "alphonso", "fruit"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "ice-cream",
  }),
  builtInRecipe({
    id: "07bd6c0f-d460-44f0-bf21-8df85c0cdafd",
    slug: "alphonso-mango-kulfi",
    name: "Alphonso Mango Kulfi",
    version_group: "Alphonso Mango",
    version_label: "Kulfi",
    ingredients: [
      "1 cup whole milk",
      "1 cup heavy cream",
      "1 1/2 cups Alphonso mango",
      "4 tbsp sugar",
      "1/4 tsp ground cardamom",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
    ],
    instructions: [
      "Blend until smooth.",
      "Taste and adjust sweetness/cardamom.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "Respin only if needed.",
    ],
    creami_setting: "Ice Cream, optional Mix-In",
    mix_ins: "",
    family_rating: null,
    notes: "Dad said it tastes like real kulfi.",
    tags: ["mango", "alphonso", "indian dessert", "family approved", "dad favorite"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "kulfi",
  }),
  builtInRecipe({
    id: "b7d003f2-8d29-4bf3-9fb7-7f3665404269",
    slug: "peaches-and-cream-ice-cream",
    name: "Peaches and Cream Ice Cream",
    version_group: "Peaches and Cream",
    version_label: "v1",
    ingredients: [
      "3/4 cup + 1 tbsp heavy cream",
      "1 cup whole milk",
      "1 1/4 to 1 1/2 cups canned peaches, drained",
      "2 tbsp reserved peach juice",
      "3 tbsp sugar, adjust to taste",
      "1 tsp vanilla extract",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
    ],
    instructions: [
      "Drain peaches and reserve 2 tbsp juice.",
      "Blend peaches, juice, cream, milk, sugar, vanilla, salt, and xanthan gum until smooth.",
      "Taste. It should taste like an amazing peach milkshake.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "Respin only if needed.",
    ],
    creami_setting: "Ice Cream, Respin if needed",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["peach", "fruit", "store-bought inspired", "mom request"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "ice-cream",
  }),
  builtInRecipe({
    id: "ebf7503f-6ad0-45f2-99a8-99d6ade56af1",
    slug: "triple-chocolate-gelato",
    name: "Triple Chocolate Gelato",
    version_group: "Chocolate",
    version_label: "Triple Chocolate Gelato",
    ingredients: [
      "4 egg yolks",
      "1/3 cup dark brown sugar",
      "2 tbsp cocoa powder",
      "1 tbsp chocolate fudge topping",
      "3/4 cup heavy cream",
      "3/4 cup whole milk",
      "2 tbsp chopped chocolate chunks",
    ],
    instructions: [
      "Whisk egg yolks and sugar.",
      "Add milk and cream.",
      "Cook until custard coats the back of a spoon.",
      "Stir in cocoa and fudge.",
      "Chill completely.",
      "Freeze for 24 hours.",
      "Run Gelato.",
      "Add chocolate chunks if not already incorporated.",
    ],
    creami_setting: "Gelato",
    mix_ins: "2 tbsp chopped chocolate chunks",
    family_rating: null,
    notes: "",
    tags: ["chocolate", "gelato", "ninja inspired"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "gelato",
  }),
  builtInRecipe({
    id: "38019c9e-f9c1-4a44-8b4b-99cfc09d75d0",
    slug: "strawberry-gelato",
    name: "Strawberry Gelato",
    version_group: "Strawberry",
    version_label: "Gelato",
    ingredients: [
      "4 egg yolks",
      "1/3 cup dark brown sugar",
      "3/4 cup heavy cream",
      "3/4 cup whole milk",
      "1 1/4 cups strawberry puree",
      "1 tsp lemon juice",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
    ],
    instructions: [
      "Blend strawberries into puree.",
      "Whisk egg yolks and brown sugar.",
      "Add cream and milk.",
      "Cook gently until custard coats the back of a spoon.",
      "Stir in strawberry puree, lemon juice, salt, and xanthan gum.",
      "Chill completely.",
      "Freeze for 24 hours.",
      "Run Gelato.",
    ],
    creami_setting: "Gelato",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["strawberry", "gelato", "banana split"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "gelato",
  }),
  builtInRecipe({
    id: "ad0da0e6-6516-451e-b9fa-736268b71ea5",
    slug: "banana-gelato",
    name: "Banana Gelato",
    version_group: "Banana",
    version_label: "Gelato",
    ingredients: [
      "4 egg yolks",
      "1/3 cup dark brown sugar",
      "3/4 cup heavy cream",
      "3/4 cup whole milk",
      "1 large ripe banana",
      "1 tsp vanilla extract",
      "1 tbsp chocolate fudge topping",
      "Pinch sea salt",
      "1/4 tsp xanthan gum",
    ],
    instructions: [
      "Whisk egg yolks and brown sugar.",
      "Add cream and milk.",
      "Cook gently until custard coats the back of a spoon.",
      "Blend custard with banana, vanilla, fudge, salt, and xanthan gum.",
      "Chill completely.",
      "Freeze for 24 hours.",
      "Run Gelato.",
    ],
    creami_setting: "Gelato",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["banana", "gelato", "banana split"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "gelato",
  }),
  builtInRecipe({
    id: "76d3e8ee-2c11-4de7-bdf7-2fe5f07b9da3",
    slug: "marshmallow-ice-cream",
    name: "Marshmallow Ice Cream",
    version_group: "Marshmallow",
    version_label: "Ice Cream",
    ingredients: [
      "3/4 cup + 1 tbsp heavy cream",
      "1 cup whole milk",
      "1 to 1 1/4 cups halal marshmallows",
      "1/4 cup sugar",
      "1 tsp vanilla extract",
      "Pinch sea salt",
    ],
    instructions: [
      "Heat the milk gently.",
      "Melt marshmallows into the milk completely.",
      "Stir in cream, sugar, vanilla, and salt.",
      "Cool completely.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
    ],
    creami_setting: "Ice Cream",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["marshmallow", "halal"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "ice-cream",
  }),
];

export function getMinorCategory(slug: string | null | undefined) {
  return MINOR_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getMajorCategory(slug: string | null | undefined) {
  return MAJOR_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getMajorForMinor(slug: string | null | undefined) {
  const minor = getMinorCategory(slug);
  return minor ? getMajorCategory(minor.major_slug) : null;
}
