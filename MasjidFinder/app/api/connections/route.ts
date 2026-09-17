import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const connectionId = request.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "Connection is required." }, { status: 400 });
  const { data: connection } = await supabase.from("connections").select("id,requester_id,recipient_id,status").eq("id", connectionId).maybeSingle();
  if (!connection || (connection.requester_id !== user.id && connection.recipient_id !== user.id)) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  const { data: conversation } = await supabase.from("conversations").select("id").eq("connection_id", connectionId).maybeSingle();
  return NextResponse.json({ conversationId: conversation?.id ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action === "accept" && typeof body.connectionId === "string") {
    const { data, error } = await supabase.rpc("fn_accept_connection", { p_connection_id: body.connectionId, p_acting_user: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "accepted", conversationId: data?.id ?? null });
  }
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId : "";
  if (!recipientId || recipientId === user.id) return NextResponse.json({ error: "Choose another profile." }, { status: 400 });
  const { data, error } = await supabase.rpc("fn_request_connection", { p_requester: user.id, p_recipient: recipientId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data?.status ?? "pending" });
}