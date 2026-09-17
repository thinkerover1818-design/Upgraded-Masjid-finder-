import { revalidatePath } from "next/cache";
import { AdminHeader, ErrorState } from "../ui";
import { adminDb, requireAdmin } from "../admin-data";
import ImageSettingUpload from "./ImageSettingUpload";

export const dynamic = "force-dynamic";

async function saveSetting(formData: FormData) {
  "use server";
  const db = adminDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: admin } = await db.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return;
  const key = String(formData.get("key"));
  const raw = String(formData.get("value"));
  let value: unknown = raw;
  try { value = JSON.parse(raw); } catch { value = raw; }
  await db.from("platform_settings").update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
  revalidatePath("/admin/settings");
}

export default async function SettingsPage() {
  const context = await requireAdmin();
  if (!context) return <main className="p-8 text-sm text-red-700">Your account is not an admin.</main>;
  const { data: settings, error } = await context.supabase.from("platform_settings").select("key,value,description,updated_at").order("key");
  return <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8"><AdminHeader title="Platform settings" description="Edit runtime configuration and upload public brand images." />{error ? <ErrorState message={error.message} /> : <div className="space-y-3">{(settings ?? []).map((item: any) => <form key={item.key} action={saveSetting} className="rounded-lg border border-black/8 bg-white p-4"><input type="hidden" name="key" value={item.key} /><div className="mb-2 flex items-start justify-between gap-4"><div><h2 className="font-semibold text-emerald-900">{item.key}</h2><p className="text-xs text-ink-400">{item.description || "Platform setting"}</p></div><button className="rounded bg-emerald-900 px-3 py-2 text-xs font-semibold text-white">Save</button></div><textarea name="value" defaultValue={JSON.stringify(item.value, null, 2)} rows={3} className="w-full rounded border border-black/10 bg-sand-50 p-2 font-mono text-xs text-ink-600" />{["logo_url", "favicon_url"].includes(item.key) && <ImageSettingUpload settingKey={item.key} />}</form>)}</div>}</main>;
}
