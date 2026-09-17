import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SearchResult {
  id: string;
  entity_type: "profile" | "masjid" | "madrasa";
  entity_id: string;
  account_code: string;
  display_name: string;
  image_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  distance_km: number | null;
  rank_score: number;
  username?: string | null;
  age?: number | null;
  country_name?: string | null;
  flag_emoji?: string | null;
  firqah?: string | null;
  roles?: string[] | null;
  profile_picture_url?: string | null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string; scope?: string; role?: string; firqah?: string; type?: string; verified?: string; lat?: string; lng?: string };
}) {
  const supabase = createClient() as any;
  const scope = searchParams.scope ?? "all_countries";

  const { data, error } = await supabase.rpc("search_listings", {
    p_roles: searchParams.role ? [searchParams.role] : null,
    p_entity_types: searchParams.type ? [searchParams.type] : null,
    p_scope: scope,
    p_my_country_id: searchParams.country || null,
    p_lat: searchParams.lat ? Number(searchParams.lat) : null,
    p_lng: searchParams.lng ? Number(searchParams.lng) : null,
    p_firqah: searchParams.firqah || null,
    p_verified_only: searchParams.verified === "1",
    p_text_query: searchParams.q || null,
    p_limit: 30,
    p_offset: 0,
  });
  const profileIds = ((data ?? []) as SearchResult[]).filter((item) => item.entity_type === "profile").map((item) => item.entity_id);
  const { data: profileCards } = profileIds.length ? await supabase.from("public_profile_cards").select("id,username,age,country_name,flag_emoji,firqah,roles,profile_picture_url,verification_status").in("id", profileIds) : { data: [] };
  const profileMap = new Map<string, any>((profileCards ?? []).map((profile: any) => [profile.id, profile]));
  const enriched = ((data ?? []) as SearchResult[]).map((item) => ({ ...item, ...(profileMap.get(item.entity_id) ?? {}) }));

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BackBar />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-4 mb-4">
          Search failed: {error.message}. If this is a fresh install, confirm the migrations in{" "}
          <code>supabase/migrations</code> (especially <code>0013_views_rpc.sql</code>) have been applied.
        </div>
      )}
      {!error && (data as SearchResult[] | null)?.length === 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-6 text-center text-sm text-ink-600">
          No results yet for this search. Try widening the scope to &quot;All Countries&quot; or &quot;Global&quot;, or check back once
          more profiles have joined.
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {enriched.map((r) => (
          <li key={r.id} className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4">
            <Link href={`/profile/${r.entity_id}?type=${r.entity_type}`} className="min-w-0 flex-1 hover:text-emerald-700">
              <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-100 text-xs font-bold text-emerald-900">{r.profile_picture_url ? <img src={r.profile_picture_url} alt="" className="h-full w-full object-cover" /> : r.display_name.slice(0, 1)}</div><div className="min-w-0"><p className="flex items-center gap-1 truncate whitespace-nowrap font-semibold text-ink-900 text-sm">{r.display_name}{(r.is_verified || r.verification_status === "verified") && <span title="Platform verified" aria-label="Platform verified" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-black text-white">✓</span>}</p><p className="truncate whitespace-nowrap text-xs text-ink-500">{r.country_name ? `${r.flag_emoji ?? ""} ${r.country_name}` : r.entity_type} · {r.firqah?.replaceAll("_", " ") || "Firqah not set"} · {(r.roles ?? []).map((role: string) => role.replaceAll("_", " ")).join(", ") || "Role not set"}</p></div></div>
            </Link>
            <div className="shrink-0"><Link href={`/profile/${r.entity_id}?type=${r.entity_type}`} className="inline-flex h-10 items-center rounded-lg border border-emerald-900 px-3 text-xs font-semibold text-emerald-900">View profile</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function BackBar() {
  return (
    <Link href="/" className="text-sm text-emerald-700 font-semibold mb-4 inline-block">
      ← Back to home
    </Link>
  );
}
