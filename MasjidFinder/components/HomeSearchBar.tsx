"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";

interface CountryOption {
  id: string;
  name: string;
  iso2: string;
  flag_emoji: string | null;
}
interface CategoryOption {
  id: string;
  role_key: string;
  label: string;
}

// This replaces the prototype's hard-coded 8-country <select> with real
// countries from the DB, and actually navigates to a working /search page
// instead of doing nothing on click.
export default function HomeSearchBar({
  countries,
  categories,
}: {
  countries: CountryOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [countryId, setCountryId] = useState("");
  const [scope, setScope] = useState("my_country");
  const [role, setRole] = useState("");

  function onSearch() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (countryId) params.set("country", countryId);
    params.set("scope", scope);
    if (role) params.set("role", role);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-3 max-w-xl mx-auto text-left flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center gap-2 border border-black/10 rounded-xl px-3 py-2.5">
        <Search size={17} className="text-ink-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search by name, role, or qualification"
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 border border-black/10 rounded-lg px-2.5 py-2 flex-1 min-w-[130px]">
          <MapPin size={14} className="text-ink-400 shrink-0" />
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="flex-1 text-xs bg-transparent outline-none">
            <option value="nearby">Nearby</option>
            <option value="my_country">My Country</option>
            <option value="other_countries">Other Countries</option>
            <option value="all_countries">All Countries</option>
            <option value="global">Global</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 border border-black/10 rounded-lg px-2.5 py-2 flex-1 min-w-[130px]">
          <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className="flex-1 text-xs bg-transparent outline-none">
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag_emoji ? `${c.flag_emoji} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border border-black/10 rounded-lg px-2.5 py-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 text-xs bg-transparent outline-none">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.role_key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onSearch}
        className="bg-emerald-900 text-white rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700"
      >
        <Search size={16} /> Search Profiles
      </button>
    </div>
  );
}
