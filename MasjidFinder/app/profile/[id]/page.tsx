import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./ProfileActions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: { params: { id: string }; searchParams: { type?: string } }) {
  const supabase = createClient() as any;
  let entityType: "profile" | "masjid" | "madrasa" = searchParams.type === "masjid" || searchParams.type === "madrasa" ? searchParams.type : "profile";
  const table = entityType === "masjid" ? "public_masjid_cards" : entityType === "madrasa" ? "public_madrasa_cards" : "public_profile_cards";
  let { data: entity } = await supabase.from(table).select("*").eq("id", params.id).maybeSingle();
  if (!entity && !searchParams.type) {
    const masjid = await supabase.from("public_masjid_cards").select("*").eq("id", params.id).maybeSingle();
    if (masjid.data) { entity = masjid.data; entityType = "masjid"; }
    else {
      const madrasa = await supabase.from("public_madrasa_cards").select("*").eq("id", params.id).maybeSingle();
      if (madrasa.data) { entity = madrasa.data; entityType = "madrasa"; }
    }
  }
  if (!entity) notFound();

  if (entityType === "masjid" || entityType === "madrasa") {
    const name = entityType === "masjid" ? entity.masjid_name : entity.madrasa_name;
    const description = entityType === "masjid" ? entity.description : entity.job_description;
    return <main className="max-w-2xl mx-auto p-6"><Link href="/search" className="text-sm text-emerald-700 font-semibold">← Back to search</Link><section className="mt-5 rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-emerald-900">{name}</h1><p className="text-sm text-ink-400 mt-1">{entity.account_code} · {entityType}</p></div>{entity.verification_status === "verified" && <span title="Platform verified" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">✓ Blue tick</span>}</div><div className="mt-6 grid gap-3 text-sm text-ink-600"><p><strong>Location:</strong> {[entity.city_name, entity.state_name, entity.country_name].filter(Boolean).join(", ") || "Not provided"}</p><p><strong>Firqah / Maslak:</strong> {entity.firqah?.replaceAll("_", " ") || "Not provided"}</p><p><strong>About:</strong> {description || "Not provided"}</p></div></section></main>;
  }

  const profile = entity;

  const { data: { user } } = await supabase.auth.getUser();
  let connection: any = null;
  if (user && user.id !== profile.id) {
    const result = await supabase.from("connections").select("id,status,requester_id,recipient_id").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`).maybeSingle();
    connection = result.data;
  }

  return <main className="max-w-2xl mx-auto p-6"><Link href="/search" className="text-sm text-emerald-700 font-semibold">← Back to search</Link><section className="mt-5 rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-emerald-900">{profile.full_name}</h1><p className="text-sm text-ink-400 mt-1">{profile.account_code} · MasjidFinder profile</p></div>{profile.verification_status === "verified" && <span title="Platform verified" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">✓ Blue tick</span>}</div><div className="mt-6 grid gap-3 text-sm text-ink-600"><p><strong>Location:</strong> {[profile.city_name, profile.state_name, profile.country_name].filter(Boolean).join(", ") || "Not provided"}</p><p><strong>Firqah / Maslak:</strong> {profile.firqah?.replaceAll("_", " ") || "Not provided"}</p><p><strong>Roles:</strong> {(profile.roles ?? []).map((role: string) => role.replaceAll("_", " ")).join(", ") || "Not provided"}</p><p><strong>Qualifications:</strong> {(profile.qualifications ?? []).join(", ") || "Not provided"}</p><p><strong>Availability:</strong> {profile.availability || "Not provided"}</p></div>{user && user.id !== profile.id && <ProfileActions recipientId={profile.id} connectionId={connection?.id ?? null} connectionStatus={connection?.status ?? null} isRecipient={connection?.recipient_id === user.id} />}{!user && <Link href={`/login?redirect=/profile/${profile.id}`} className="mt-6 inline-block rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Log in to connect</Link>}</section></main>;
}