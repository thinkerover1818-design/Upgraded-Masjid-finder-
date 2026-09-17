import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SearchFilters from "./SearchFilters";

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
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string; scope?: string; role?: string; type?: string; verified?: string; lat?: string; lng?: string };
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
    p_verified_only: searchParams.verified === "1",
    p_text_query: searchParams.q || null,
    p_limit: 30,
    p_offset: 0,
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BackBar />
      <SearchFilters />
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
        {((data as SearchResult[] | null) ?? []).map((r) => (
          <li key={r.id} className="rounded-xl border border-black/10 bg-white p-4 flex items-center justify-between gap-4">
            <Link href={`/profile/${r.entity_id}?type=${r.entity_type}`} className="min-w-0 flex-1 hover:text-emerald-700">
              <p className="font-semibold text-ink-900 text-sm">{r.display_name}</p>
              <p className="text-xs text-ink-400">
                {r.account_code} · {r.entity_type}
                {r.distance_km != null ? ` · ${r.distance_km.toFixed(1)} km away` : ""}
              </p>
            </Link>
            <div className="flex items-center gap-1.5">
              {r.is_verified && (
                <span title="Platform verified" aria-label="Platform verified" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white ring-2 ring-white">
                  ✓
                </span>
              )}
              {r.is_featured && (
                <span className="text-[10px] font-semibold bg-gold-500/20 text-gold-600 px-2 py-1 rounded-full">
                  Featured
                </span>
              )}
              <Link href={`/profile/${r.entity_id}?type=${r.entity_type}`} className="rounded-lg border border-emerald-900 px-3 py-2 text-xs font-semibold text-emerald-900">View profile</Link>
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
