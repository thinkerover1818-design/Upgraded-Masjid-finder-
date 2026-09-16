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
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; country?: string; scope?: string; role?: string };
}) {
  const supabase = createClient() as any;
  const scope = searchParams.scope ?? "all_countries";

  if (scope === "nearby") {
    // Nearby requires real device coordinates. We never fabricate a location —
    // if none was captured, we say so plainly instead of silently falling
    // back to fake "nearby" results.
    return (
      <main className="max-w-3xl mx-auto p-6">
        <BackBar />
        <div className="rounded-xl border border-black/10 bg-white p-6 text-center">
          <p className="text-sm text-ink-600 mb-2">
            &quot;Nearby&quot; needs your device location. This page doesn&apos;t yet request browser geolocation — use{" "}
            <strong>My Country</strong>, <strong>Other Countries</strong>, or <strong>Global</strong> for now, or
            search again after enabling location in your browser.
          </p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase.rpc("search_listings", {
    p_roles: searchParams.role ? [searchParams.role] : null,
    p_scope: scope,
    p_my_country_id: searchParams.country || null,
    p_text_query: searchParams.q || null,
    p_limit: 30,
    p_offset: 0,
  });

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
        {((data as SearchResult[] | null) ?? []).map((r) => (
          <li key={r.id} className="rounded-xl border border-black/10 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-900 text-sm">{r.display_name}</p>
              <p className="text-xs text-ink-400">
                {r.account_code} · {r.entity_type}
                {r.distance_km != null ? ` · ${r.distance_km.toFixed(1)} km away` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {r.is_verified && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  Verified
                </span>
              )}
              {r.is_featured && (
                <span className="text-[10px] font-semibold bg-gold-500/20 text-gold-600 px-2 py-1 rounded-full">
                  Featured
                </span>
              )}
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
