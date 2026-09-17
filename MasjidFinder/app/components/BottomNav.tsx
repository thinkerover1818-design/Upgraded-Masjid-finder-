"use client";

import Link from "next/link";
import { Bell, Home, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(27,35,32,0.08)] backdrop-blur">
    <div className="mx-auto grid max-w-lg grid-cols-5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-emerald-900" : "text-ink-400"}`}>
          <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
          <span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}