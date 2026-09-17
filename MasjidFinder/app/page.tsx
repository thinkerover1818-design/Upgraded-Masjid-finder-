import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomeSearchBar from "@/components/HomeSearchBar";

// Everything below reads from platform_settings/categories/countries —
// nothing is hard-coded, so renaming a category or adding a country never
// requires touching this file (satisfies the "no code change" requirement).
async function getHomeData() {
  const supabase = createClient() as any;

  const [{ data: settingsRows }, { data: categories }, { data: countries }] = await Promise.all([
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["platform_name", "hero_title", "hero_description", "shop_enabled", "donations_enabled"]),
    supabase
      .from("categories")
      .select("id, role_key, label, subtitle, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("countries")
      .select("id, name, iso2, flag_emoji")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  const settings: Record<string, unknown> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;

  return {
    platformName: (settings.platform_name as string) ?? "MasjidFinder",
    heroTitle: (settings.hero_title as string) ?? "Find the right Imam, Hafiz or Madrasa",
    heroDescription:
      (settings.hero_description as string) ??
      "One platform connecting Masjids, Imams, Huffaz, Qaris, Madrasas, teachers and scholars.",
    shopEnabled: Boolean(settings.shop_enabled),
    donationsEnabled: settings.donations_enabled !== false,
    categories: categories ?? [],
    countries: countries ?? [],
  };
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof getHomeData>> | null = null;
  let loadError: string | null = null;
  try {
    data = await getHomeData();
  } catch (e) {
    // Fails honestly instead of rendering fabricated categories/countries.
    loadError = e instanceof Error ? e.message : "Could not reach the database.";
  }

  if (!data) {
    return (
      <main className="max-w-lg mx-auto p-8 text-center">
        <h1 className="text-xl font-semibold text-red-800 mb-2">Could not load the homepage</h1>
        <p className="text-sm text-ink-600">
          {loadError} — check that <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          are set and the migrations in <code>supabase/migrations</code> have been applied.
        </p>
      </main>
    );
  }

  return (
    <div className="bg-sand-50 min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur bg-sand-50/90 border-b border-black/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-emerald-900 text-lg">{data.platformName}</span>
          <nav className="flex items-center gap-2">
            <Link href="/plans" className="text-xs font-semibold text-emerald-900 sm:text-sm">
              Plans
            </Link>
            {data.shopEnabled && (
              <Link href="/shop" className="text-xs font-semibold text-emerald-900 sm:text-sm">
                Shop
              </Link>
            )}
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg border border-emerald-900 text-emerald-900">
              Log In
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-900 text-white">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
        <h1 className="text-3xl font-medium text-emerald-900 leading-tight mb-3">{data.heroTitle}</h1>
        <p className="text-ink-600 max-w-md mx-auto mb-6">{data.heroDescription}</p>
        <HomeSearchBar countries={data.countries} categories={data.categories} />
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-medium text-emerald-900 mb-1">Browse by need</h2>
        <p className="text-sm text-ink-400 mb-4">Every category is two-way — post a need, or list your availability.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.categories.map((c: any) => (
            <Link
              key={c.id}
              href={`/search?role=${c.role_key}`}
              className="rounded-2xl border border-black/10 bg-white p-4 hover:border-emerald-600 hover:-translate-y-0.5 transition"
            >
              <h3 className="text-sm font-bold text-ink-900 mb-1">{c.label}</h3>
              <p className="text-xs text-ink-400">{c.subtitle}</p>
            </Link>
          ))}
        </div>
        {data.categories.length === 0 && (
          <p className="text-sm text-ink-400">
            No categories are configured yet. An admin can add them under Admin → Categories.
          </p>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap gap-3 justify-center">
        <Link href="/plans" className="rounded-full border border-emerald-900 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
          Subscription & Boost Plans
        </Link>
        {data.donationsEnabled && (
          <span className="rounded-full border border-black/10 bg-sand-100 px-4 py-2 text-sm font-semibold text-ink-400">
            Donate (backend ready, page coming soon)
          </span>
        )}
        {data.shopEnabled ? <Link
          href="/shop"
          className={`rounded-full border border-black/10 px-4 py-2 text-sm font-semibold ${
            "bg-white text-emerald-900 hover:bg-emerald-50"
          }`}
        >
          Islamic Shop
        </Link> : <span className="rounded-full border border-black/10 bg-sand-100 px-4 py-2 text-sm font-semibold text-ink-400">Islamic Shop (currently unavailable)</span>}
      </section>

      <footer className="border-t border-black/5 mt-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 text-xs text-ink-400">
          <Link href="/about" className="hover:text-emerald-800">About</Link><Link href="/how-it-works" className="hover:text-emerald-800">How it works</Link><Link href="/contact" className="hover:text-emerald-800">Contact</Link><Link href="/faq" className="hover:text-emerald-800">FAQ</Link><Link href="/privacy" className="hover:text-emerald-800">Privacy</Link><Link href="/terms" className="hover:text-emerald-800">Terms</Link>
          <span className="basis-full">
          © {new Date().getFullYear()} {data.platformName}. Verification confirms admin document review only, not
          religious authority.
          </span>
        </div>
      </footer>
    </div>
  );
}
