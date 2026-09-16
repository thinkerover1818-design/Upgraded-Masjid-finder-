import { revalidatePath } from "next/cache";
import { AdminHeader, EmptyState, ErrorState, StatusBadge } from "../ui";
import { adminDb, dateLabel, queryText, requireAdmin } from "../admin-data";

export const dynamic = "force-dynamic";

async function setUserStatus(formData: FormData) {
  "use server";
  const db = adminDb(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  const id = String(formData.get("id")); const action = String(formData.get("action"));
  await db.from("profiles").update(action === "ban" ? { is_banned: true, is_active: false } : action === "suspend" ? { is_suspended: true } : { is_banned: false, is_suspended: false, is_active: true }).eq("id", id);
  revalidatePath("/admin/users");
}

async function setVerification(formData: FormData) {
  "use server";
  const db = adminDb(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  const id = String(formData.get("id")); const status = String(formData.get("status"));
  if (!["verified", "unverified"].includes(status)) return;
  await db.from("profiles").update({ verification_status: status }).eq("id", id);
  await db.from("admin_audit_logs").insert({ admin_profile_id: user.id, action: status === "verified" ? "verify_profile" : "remove_profile_verification", target_entity_type: "profile", target_entity_id: id, after_state: { verification_status: status } });
  revalidatePath("/admin/users");
}

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const context = await requireAdmin(); if (!context) return <main className="p-8 text-sm text-red-700">Your account is not an admin.</main>;
  const q = queryText(searchParams.q); const status = queryText(searchParams.status);
  let request = context.supabase.from("profiles").select("id, account_code, full_name, verification_status, is_active, is_suspended, is_banned, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
  if (q) request = request.or(`full_name.ilike.%${q}%,account_code.ilike.%${q}%`);
  if (status === "banned") request = request.eq("is_banned", true); if (status === "suspended") request = request.eq("is_suspended", true); if (status === "active") request = request.eq("is_active", true);
  const { data: users, error } = await request;
  return <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><AdminHeader title="Users" description="Manage profiles, status, and platform verification." /><form className="mb-5 flex flex-col gap-2 sm:flex-row"><input name="q" defaultValue={q} placeholder="Search name or account code" className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm" /><select name="status" defaultValue={status} className="rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select><button className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Filter</button></form>{error ? <ErrorState message={error.message} /> : !users?.length ? <EmptyState title="No users found" description="Try a different search or filter." /> : <div className="overflow-x-auto rounded-lg border border-black/8 bg-white"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b border-black/5 bg-sand-50 text-xs text-ink-600"><tr><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-black/5">{users.map((item: any) => <tr key={item.id}><td className="px-4 py-3"><p className="font-semibold text-emerald-900">{item.full_name}</p><p className="text-xs text-ink-400">{item.account_code}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><StatusBadge status={item.verification_status} />{item.verification_status === "verified" && <span className="text-xs font-bold text-blue-600">Blue tick</span>}</div></td><td className="px-4 py-3"><StatusBadge status={item.is_banned ? "banned" : item.is_suspended ? "suspended" : item.is_active ? "active" : "inactive"} /></td><td className="px-4 py-3 text-xs text-ink-600">{dateLabel(item.created_at)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><form action={setVerification}><input type="hidden" name="id" value={item.id} /><button name="status" value={item.verification_status === "verified" ? "unverified" : "verified"} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">{item.verification_status === "verified" ? "Remove blue tick" : "Give blue tick"}</button></form><form action={setUserStatus}><input type="hidden" name="id" value={item.id} /><button name="action" value={item.is_suspended || item.is_banned ? "restore" : "suspend"} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold">{item.is_suspended || item.is_banned ? "Restore" : "Suspend"}</button></form></div></td></tr>)}</tbody></table></div>}</main>;
}
