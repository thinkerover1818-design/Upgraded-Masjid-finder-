import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const { data: admin } = await session.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.formData();
  const key = String(body.get("key") || "");
  const file = body.get("file");
  if (!(file instanceof File) || !["logo_url", "favicon_url"].includes(key) || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Choose a valid image up to 5MB." }, { status: 400 });
  const storage = createAdminClient() as any;
  const path = `platform/${key}-${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
  const upload = await storage.storage.from("institution-logos").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
  const url = storage.storage.from("institution-logos").getPublicUrl(path).data.publicUrl;
  const { error } = await storage.from("platform_settings").update({ value: JSON.stringify(url), updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ url });
}
