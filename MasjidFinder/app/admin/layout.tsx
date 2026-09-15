import Link from "next/link";

// Admin route access is enforced by middleware.ts (redirects non-admins)
// AND by RLS/is_admin() on every query underneath — this layout is just the
// shell. Only links to pages that actually exist and do something are
// listed as clickable; everything else in the spec that isn't built yet is
// listed as "planned" rather than linked to a dead/fake screen.
const BUILT = [{ href: "/admin/verification", label: "Verification Queue" }];

const PLANNED = [
  "Dashboard & Analytics",
  "Users",
  "Masjids / Madrasas / Events",
  "Countries / States / Cities",
  "Subscriptions & Purchase Enquiries",
  "Donations",
  "Referrals",
  "Reports & Blocks",
  "Translations",
  "Platform Settings",
  "Admin Users & Audit Logs",
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50 flex">
      <aside className="w-56 shrink-0 border-r border-black/5 bg-white p-4 hidden md:block">
        <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Admin</p>
        <nav className="flex flex-col gap-1 mb-6">
          {BUILT.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-emerald-900 font-semibold px-2 py-1.5 rounded hover:bg-emerald-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Planned (schema + RLS ready, UI not built)</p>
        <ul className="flex flex-col gap-1">
          {PLANNED.map((l) => (
            <li key={l} className="text-xs text-ink-400 px-2 py-1">
              {l}
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
