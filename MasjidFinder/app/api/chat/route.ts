import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
  const { data, error } = await supabase.from("messages").select("id,conversation_id,sender_id,message_type,content,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!conversationId || !content) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, message_type: "text", content }).select("id,conversation_id,sender_id,message_type,content,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
