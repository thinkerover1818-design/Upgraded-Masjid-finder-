import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to enquire about a plan." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const planId = typeof body?.planId === "string" ? body.planId : "";
  const contactMethod = body?.contactMethod === "email" ? "email" : "whatsapp";
  if (!planId) return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  const { error } = await supabase.from("purchase_enquiries").insert({ profile_id: user.id, plan_id: planId, contact_method: contactMethod });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}