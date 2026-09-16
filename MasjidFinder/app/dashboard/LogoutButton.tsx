"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }
  return <button onClick={logout} className="rounded-lg border border-emerald-900 px-4 py-2 text-sm font-semibold text-emerald-900">Log out</button>;
}