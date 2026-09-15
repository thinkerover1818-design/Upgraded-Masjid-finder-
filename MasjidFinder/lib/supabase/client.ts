// Browser client — safe to import from Client Components. Uses only the
// public anon key (NEXT_PUBLIC_*). Row Level Security on every table is what
// actually protects data; this client has no elevated privileges.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
