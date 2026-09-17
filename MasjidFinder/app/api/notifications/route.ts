import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  let query = supabase.from("notifications").update({ is_read: true, sent_at: new Date().toISOString() }).eq("profile_id", user.id);
  if (typeof body?.notificationId === "string") query = query.eq("id", body.notificationId);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}