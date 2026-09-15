// SERVER-ONLY client using the service-role key. This file must NEVER be
// imported from a Client Component ("use client") or from anything bundled
// for the browser — Next.js will throw at build time if SUPABASE_SERVICE_ROLE_KEY
// (no NEXT_PUBLIC_ prefix) is referenced outside a server context, but we
// also guard explicitly here as defense in depth.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not configured. " +
      "Admin-only operations cannot run until these are set in your environment."
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
