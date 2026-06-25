import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function cleanPublicEnv(value: string | undefined) {
  return value?.replace(/^\uFEFF/, "").trim();
}

export function getSupabaseClient() {
  const url = cleanPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key =
    cleanPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    cleanPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, key);
  }

  return browserClient;
}

export const PHOTO_BUCKET = "creami-photos";
