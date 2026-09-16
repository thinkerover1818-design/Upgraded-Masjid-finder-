import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./ProfileActions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient() as any;
  const { data: profile } = await supabase.from("public_profile_cards").select("*").eq("id", params.id).maybeSingle();
  if (!profile) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let connection: any = null;
  if (user && user.id !== profile.id) {
    const result = await supabase.from("connections").select("id,status,requester_id,recipient_id").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`).maybeSingle();
    connection = result.data;
  }

  return <main className="max-w-2xl mx-auto p-6"><Link href="/search" className="text-sm text-emerald-700 font-semibold">← Back to search</Link><section className="mt-5 rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-emerald-900">{profile.full_name}</h1><p className="text-sm text-ink-400 mt-1">{profile.account_code} · MasjidFinder profile</p></div>{profile.verification_status === "verified" && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Verified</span>}</div><div className="mt-6 grid gap-3 text-sm text-ink-600"><p><strong>Location:</strong> {[profile.city_name, profile.state_name, profile.country_name].filter(Boolean).join(", ") || "Not provided"}</p><p><strong>Firqah / Maslak:</strong> {profile.firqah?.replaceAll("_", " ") || "Not provided"}</p><p><strong>Roles:</strong> {(profile.roles ?? []).map((role: string) => role.replaceAll("_", " ")).join(", ") || "Not provided"}</p><p><strong>Qualifications:</strong> {(profile.qualifications ?? []).join(", ") || "Not provided"}</p><p><strong>Availability:</strong> {profile.availability || "Not provided"}</p></div>{user && user.id !== profile.id && <ProfileActions recipientId={profile.id} connectionId={connection?.id ?? null} connectionStatus={connection?.status ?? null} isRecipient={connection?.recipient_id === user.id} />}{!user && <Link href={`/login?redirect=/profile/${profile.id}`} className="mt-6 inline-block rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Log in to connect</Link>}</section></main>;
}