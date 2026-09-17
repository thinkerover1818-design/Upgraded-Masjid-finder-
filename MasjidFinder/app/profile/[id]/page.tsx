import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./ProfileActions";
import SocialActions from "./SocialActions";

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
    return <main className="max-w-2xl mx-auto p-6"><Link href="/search" className="text-sm text-emerald-700 font-semibold">← Back to search</Link><section className="mt-5 rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-emerald-900">{name}</h1><p className="text-sm text-ink-400 mt-1">{entity.account_code} · {entityType}</p></div>{entity.verification_status === "verified" && <span title="Platform verified" aria-label="Platform verified" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-black text-white ring-2 ring-blue-100">✓</span>}</div><div className="mt-6 grid gap-3 text-sm text-ink-600"><p><strong>Location:</strong> {[entity.city_name, entity.state_name, entity.country_name].filter(Boolean).join(", ") || "Not provided"}</p><p><strong>Firqah / Maslak:</strong> {entity.firqah?.replaceAll("_", " ") || "Not provided"}</p><p><strong>About:</strong> {description || "Not provided"}</p></div></section></main>;
  }

  const profile = entity;

  const { data: { user } } = await supabase.auth.getUser();
  let connection: any = null;
  if (user && user.id !== profile.id) {
    const result = await supabase.from("connections").select("id,status,requester_id,recipient_id").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`).maybeSingle();
    connection = result.data;
  }
  const [{ data: followRow }, { count: followerCount }, { count: followingCount }, { count: referralCount }] = user && user.id !== profile.id ? await Promise.all([
    supabase.from("profile_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle(),
    supabase.from("profile_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("profile_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
  ]) : [{ data: null }, { count: null }, { count: null }, { count: null }];

  return <main className="max-w-2xl mx-auto p-6"><Link href="/search" className="text-sm text-emerald-700 font-semibold">← Back to search</Link><section className="mt-5 rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-100 text-xl font-bold text-emerald-900">{profile.profile_picture_url ? <img src={profile.profile_picture_url} alt={profile.full_name} className="h-full w-full object-cover" /> : profile.full_name.slice(0, 1)}</div><div className="min-w-0"><h1 className="truncate whitespace-nowrap text-2xl font-semibold text-emerald-900">{profile.full_name}</h1><p className="truncate text-sm text-ink-400">@{profile.username || profile.account_code}</p><p className="mt-2 text-xs text-ink-500">{followerCount ?? 0} followers · {followingCount ?? 0} following · {referralCount ?? 0} referrals</p></div></div><p className="mt-6 text-sm leading-6 text-ink-600">{profile.short_bio || "No bio added yet."}</p><div className="mt-5 grid gap-3 text-sm text-ink-600"><p><strong>Location:</strong> {[profile.address_general, profile.city_name, profile.state_name, profile.country_name].filter(Boolean).join(", ") || "Not provided"}</p><p><strong>Country:</strong> {profile.flag_emoji ?? ""} {profile.country_name || "Not provided"}</p><p><strong>Firqah / Maslak:</strong> {profile.firqah?.replaceAll("_", " ") || "Not provided"} · <strong>Age:</strong> {profile.age ?? "Not provided"}</p><p><strong>Roles:</strong> {(profile.roles ?? []).map((role: string) => role.replaceAll("_", " ")).join(", ") || "Not provided"}</p><p><strong>Qualifications:</strong> {(profile.qualifications ?? []).join(", ") || "Not provided"}</p></div>{user && user.id !== profile.id && <SocialActions profileId={profile.id} isFollowing={Boolean(followRow)} connection={<ProfileActions recipientId={profile.id} connectionId={connection?.id ?? null} connectionStatus={connection?.status ?? null} isRecipient={connection?.recipient_id === user.id} />} />}{!user && <Link href={`/login?redirect=/profile/${profile.id}`} className="mt-6 inline-block rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Log in to connect</Link>}</section></main>;
}