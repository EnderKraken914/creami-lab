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

export type Recipe = {
  id: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  version_group: string | null;
  version_label: string | null;
  version_notes: string;
  ingredients: string[];
  instructions: string[];
  creami_setting: string;
  mix_ins: string;
  family_rating: number | null;
  notes: string;
  tags: string[];
  photo_before_url: string | null;
  photo_before_path: string | null;
  photo_after_url: string | null;
  photo_after_path: string | null;
  built_in: boolean;
  last_made: string | null;
  minor_category_slug: MinorCategorySlug | null;
};

export type RecipeReview = {
  id: string;
  recipe_id: string;
  created_at: string;
  reviewer_name: string;
  rating: number;
  notes: string;
};

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
    "created_at" | "updated_at" | "version_group" | "version_label" | "version_notes"
  > &
    Partial<Pick<Recipe, "version_group" | "version_label" | "version_notes">>,
): Recipe {
  return {
    version_group: null,
    version_label: null,
    version_notes: "",
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
      "1/8 tsp xanthan gum",
    ],
    instructions: [
      "Blend all ingredients until smooth.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "If crumbly, add 1 tbsp milk and Respin.",
      "Add 4 tbsp chilled chocolate fudge.",
      "Run Mix-In.",
    ],
    creami_setting: "Ice Cream, Respin if needed, Mix-In",
    mix_ins: "4 tbsp chilled chocolate fudge",
    family_rating: null,
    notes: "",
    tags: ["banana", "fudge swirl", "ice cream"],
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
      "1/8 tsp xanthan gum",
    ],
    instructions: [
      "Blend until smooth.",
      "Taste and adjust sweetness.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "Respin only if needed.",
    ],
    creami_setting: "Ice Cream, Respin if needed",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["alphonso mango", "mango", "ice cream"],
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
      "1/8 tsp xanthan gum",
    ],
    instructions: [
      "Blend until smooth.",
      "Taste and adjust.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
      "Optional: Mix in pistachios.",
    ],
    creami_setting: "Ice Cream, optional Mix-In",
    mix_ins: "Pistachios, optional",
    family_rating: null,
    notes: "",
    tags: ["alphonso mango", "mango", "kulfi", "cardamom"],
    photo_before_url: null,
    photo_before_path: null,
    photo_after_url: null,
    photo_after_path: null,
    built_in: true,
    last_made: null,
    minor_category_slug: "kulfi",
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
    tags: ["chocolate", "gelato", "fudge"],
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
      "1/8 tsp xanthan gum",
    ],
    instructions: [
      "Blend strawberries.",
      "Make custard with yolks, sugar, milk and cream.",
      "Stir in strawberry puree.",
      "Add lemon juice, salt and xanthan gum.",
      "Chill completely.",
      "Freeze for 24 hours.",
      "Run Gelato.",
    ],
    creami_setting: "Gelato",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["strawberry", "gelato"],
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
      "1/8 tsp xanthan gum",
    ],
    instructions: [
      "Make custard.",
      "Blend custard with banana, vanilla, fudge, salt and xanthan gum.",
      "Chill.",
      "Freeze for 24 hours.",
      "Run Gelato.",
    ],
    creami_setting: "Gelato",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["banana", "gelato", "fudge"],
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
      "1-1 1/4 cups halal marshmallows",
      "1/4 cup sugar",
      "1 tsp vanilla extract",
      "Pinch sea salt",
    ],
    instructions: [
      "Heat the milk.",
      "Melt marshmallows completely.",
      "Stir in remaining ingredients.",
      "Cool.",
      "Freeze for 18-24 hours.",
      "Run Ice Cream.",
    ],
    creami_setting: "Ice Cream",
    mix_ins: "",
    family_rating: null,
    notes: "",
    tags: ["marshmallow", "ice cream"],
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
