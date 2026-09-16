import { createClient } from "@/lib/supabase/server";

export function adminDb() { return createClient() as any; }

export async function requireAdmin() {
  const supabase = adminDb();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from("admin_users").select("profile_id, admin_role, managed_country_id, is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return null;
  return { supabase, user, admin };
}

export function dateLabel(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "-"; }
export function queryText(value: string | string[] | undefined) { return typeof value === "string" ? value.trim() : ""; }