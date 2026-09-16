import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, account_code, profile_completeness_pct").eq("id", user.id).maybeSingle();
  return <main className="min-h-screen bg-sand-50 p-6"><div className="max-w-2xl mx-auto"><header className="flex items-center justify-between mb-8"><div><p className="text-xs text-ink-400">MasjidFinder account</p><h1 className="text-2xl font-semibold text-emerald-900">Assalamu alaikum, {profile?.full_name ?? user.user_metadata?.full_name ?? "there"}</h1></div><LogoutButton /></header><section className="rounded-2xl border border-black/10 bg-white p-6"><p className="text-sm text-ink-600">Your Google session is active and your profile is saved securely.</p><p className="text-xs text-ink-400 mt-2">Account {profile?.account_code ?? "pending"} · {profile?.profile_completeness_pct ?? 0}% complete</p><Link href="/dashboard/profile" className="inline-block mt-5 rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Edit profile</Link></section></div></main>;
}