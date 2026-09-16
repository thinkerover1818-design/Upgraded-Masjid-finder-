"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [locationError, setLocationError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) if (value) next.set(key, String(value));
    if (form.get("verified")) next.set("verified", "1");
    router.push(`/search?${next.toString()}`);
  }

  function useLocation() {
    setBusy(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = new URLSearchParams(params.toString());
        next.set("scope", "nearby");
        next.set("lat", String(position.coords.latitude));
        next.set("lng", String(position.coords.longitude));
        router.push(`/search?${next.toString()}`);
        setBusy(false);
      },
      () => { setLocationError("Allow location access to search nearby."); setBusy(false); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return <form onSubmit={submit} className="mb-5 rounded-xl border border-black/10 bg-white p-4">
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <input name="q" defaultValue={params.get("q") ?? ""} placeholder="Search name or qualification" className="rounded-lg border border-black/10 px-3 py-2 text-sm lg:col-span-2" />
      <select name="scope" defaultValue={params.get("scope") ?? "all_countries"} className="rounded-lg border border-black/10 px-3 py-2 text-sm"><option value="all_countries">All countries</option><option value="global">Global</option><option value="other_countries">Other countries</option><option value="nearby">Nearby</option></select>
      <select name="type" defaultValue={params.get("type") ?? ""} className="rounded-lg border border-black/10 px-3 py-2 text-sm"><option value="">All listing types</option><option value="profile">People</option><option value="masjid">Masjids</option><option value="madrasa">Madrasas</option></select>
      <button className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-600">
      <label className="flex items-center gap-2"><input type="checkbox" name="verified" defaultChecked={params.get("verified") === "1"} /> Verified only</label>
      <button type="button" onClick={useLocation} disabled={busy} className="rounded-md border border-emerald-900 px-3 py-1.5 font-semibold text-emerald-900 disabled:opacity-50">{busy ? "Finding you…" : "Use my location"}</button>
      {locationError && <span className="text-red-700">{locationError}</span>}
    </div>
  </form>;
}