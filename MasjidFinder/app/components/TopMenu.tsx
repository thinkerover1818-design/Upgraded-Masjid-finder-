"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TopMenu({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  async function logout() { await createClient().auth.signOut(); window.location.assign("/"); }
  return <div className="relative"><button type="button" aria-label="Open menu" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-black/10 p-2 text-emerald-900"><span className="sr-only">Menu</span>{open ? <X size={20} /> : <Menu size={20} />}</button>{open && <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-black/10 bg-white p-2 shadow-lg"><div className="grid gap-1 text-sm font-semibold text-emerald-900"><Link onClick={() => setOpen(false)} href="/dashboard/profile" className="rounded-lg px-3 py-2 hover:bg-sand-50">Profile</Link><Link onClick={() => setOpen(false)} href="/notifications" className="rounded-lg px-3 py-2 hover:bg-sand-50">Notifications</Link><Link onClick={() => setOpen(false)} href="/referrals" className="rounded-lg px-3 py-2 hover:bg-sand-50">Refer & earn</Link><Link onClick={() => setOpen(false)} href="/plans" className="rounded-lg px-3 py-2 hover:bg-sand-50">Plans</Link><Link onClick={() => setOpen(false)} href="/about" className="rounded-lg px-3 py-2 hover:bg-sand-50">About</Link><Link onClick={() => setOpen(false)} href="/contact" className="rounded-lg px-3 py-2 hover:bg-sand-50">Contact</Link>{loggedIn ? <button type="button" onClick={logout} className="mt-1 rounded-lg bg-emerald-900 px-3 py-2 text-center text-white">Log out</button> : <Link onClick={() => setOpen(false)} href="/login" className="mt-1 rounded-lg bg-emerald-900 px-3 py-2 text-center text-white">Log in</Link>}</div></div>}</div>;
}