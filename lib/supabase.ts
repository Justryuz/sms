import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False jika kunci .env tiada. UI akan menggunakan data contoh. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Klien pelayar (anon key, baca sahaja melalui RLS). Null dalam mod demo. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
