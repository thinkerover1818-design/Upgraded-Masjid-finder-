import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in to enquire about a plan." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const planId = typeof body?.planId === "string" ? body.planId : "";
  const contactMethod = body?.contactMethod === "email" ? "email" : "whatsapp";
  const whatsappMessage = typeof body?.whatsappMessage === "string" ? body.whatsappMessage.trim() : "";
  if (!planId) return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  const { error } = await supabase.from("purchase_enquiries").insert({ profile_id: user.id, plan_id: planId, contact_method: contactMethod });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: settings } = await supabase.from("platform_settings").select("key,value").in("key", ["whatsapp_number", "support_email"]);
  const values = Object.fromEntries((settings ?? []).map((row: any) => [row.key, typeof row.value === "string" ? row.value : row.value?.replace?.(/^"|"$/g, "") ?? ""]));
  const destination = contactMethod === "email" ? values.support_email : values.whatsapp_number;
  const redirectUrl = contactMethod === "email" && destination ? `mailto:${destination}?subject=${encodeURIComponent("MasjidFinder plan enquiry")}` : contactMethod === "whatsapp" && destination ? `https://wa.me/${String(destination).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage || "I have sent a MasjidFinder plan enquiry.")}` : null;
  return NextResponse.json({ ok: true, redirectUrl });
}