import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "./components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "MasjidFinder — Global Islamic Professional Network",
  description:
    "Connecting Masjids, Imams, Hafiz/Qaris, Madrasas, Teachers, Moulvis/Scholars and Islamic Event Organizers worldwide.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B342B",
};

// Resolves language/RTL from the `languages` table (admin-editable, not a
// hard-coded switch) so adding a new RTL language later needs zero code
// changes. Falls back to LTR/English only if the DB is unreachable.
async function resolveLocale() {
  const cookieStore = cookies();
  const requested = cookieStore.get("lang")?.value ?? "en";
  try {
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("languages")
      .select("code, is_rtl")
      .eq("code", requested)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return { code: data.code as string, dir: data.is_rtl ? "rtl" : "ltr" };
    return { code: "en", dir: "ltr" };
  } catch {
    return { code: requested, dir: "ltr" };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { code, dir } = await resolveLocale();
  return (
    <html lang={code} dir={dir}>
      <body className="min-h-screen pb-16 font-sans antialiased">{children}<BottomNav /></body>
    </html>
  );
}
