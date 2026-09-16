import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId : "";
  if (!recipientId || recipientId === user.id) return NextResponse.json({ error: "Choose another profile." }, { status: 400 });
  const { data, error } = await supabase.rpc("fn_request_connection", { p_requester: user.id, p_recipient: recipientId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data?.status ?? "pending" });
}