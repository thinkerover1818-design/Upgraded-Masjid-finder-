"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronRight, CreditCard, Flag, GraduationCap, LayoutDashboard, MapPin, Settings, Shield, Users, Building2 } from "lucide-react";

const sections = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/masjids", label: "Masjids", icon: Building2 },
  { href: "/admin/madrasas", label: "Madrasas", icon: GraduationCap },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/verification", label: "Verification", icon: CheckCircle2 },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/reports", label: "Reports & blocks", icon: Flag },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();
  return <>
    <div className="flex items-center justify-between border-b border-emerald-900/10 bg-emerald-900 px-4 py-3 text-white md:hidden"><Link href="/admin" className="font-semibold tracking-tight">MasjidFinder <span className="text-gold-500">Admin</span></Link><Shield size={18} aria-hidden="true" /></div>
    <nav className="flex gap-1 overflow-x-auto border-b border-black/5 bg-white px-3 py-2 md:hidden" aria-label="Admin navigation">{sections.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-900" : "text-ink-600"}`}><Icon size={15} />{label}</Link>; })}</nav>
    <aside className="hidden w-64 shrink-0 border-r border-black/5 bg-white px-4 py-5 md:block"><Link href="/admin" className="mb-7 block px-2 text-lg font-bold tracking-tight text-emerald-900">MasjidFinder <span className="text-gold-600">Admin</span></Link><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">Workspace</p><nav className="space-y-1" aria-label="Admin navigation">{sections.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-emerald-100 text-emerald-900" : "text-ink-600 hover:bg-sand-100 hover:text-emerald-900"}`}><Icon size={17} /><span className="flex-1">{label}</span>{active && <ChevronRight size={15} />}</Link>; })}</nav><div className="mt-8 rounded-md bg-sand-100 p-3 text-xs text-ink-600"><div className="mb-1 flex items-center gap-2 font-semibold text-emerald-900"><Shield size={14} /> Protected workspace</div>Changes are checked by server-side authorization and database policies.</div></aside>
  </>;
}