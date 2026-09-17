import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/referrals");
  const [{ data: profile }, { count }] = await Promise.all([supabase.from("profiles").select("referral_code,username").eq("id", user.id).single(), supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id)]);
  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/signup?ref=${profile?.referral_code ?? ""}`;
  return <main className="min-h-screen bg-sand-50 p-6"><section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6"><Link href="/" className="text-sm font-semibold text-emerald-700">Home</Link><h1 className="mt-5 text-2xl font-semibold text-emerald-900">Refer & earn</h1><p className="mt-2 text-sm text-ink-600">Invite people with your referral code.</p><div className="mt-6 rounded-xl bg-sand-50 p-4"><p className="text-xs text-ink-400">Your referral code</p><p className="mt-1 text-xl font-bold tracking-wider text-emerald-900">{profile?.referral_code}</p><p className="mt-4 break-all text-xs text-ink-500">{link}</p></div><p className="mt-5 text-sm font-semibold text-ink-800">Successful referrals: {count ?? 0}</p></section></main>;
}