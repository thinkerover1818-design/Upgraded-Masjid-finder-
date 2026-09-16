import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: { conversation?: string } }) {
  const supabase = createClient() as any; const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login?redirect=/chat");
  const { data: conversations } = await supabase.from("conversations").select("id,connection_id,created_at").order("created_at", { ascending: false });
  const conversationId = searchParams.conversation || conversations?.[0]?.id;
  return <main className="min-h-screen bg-sand-50 p-6"><div className="mx-auto max-w-4xl"><div className="mb-5 flex items-center justify-between"><div><Link href="/dashboard" className="text-sm font-semibold text-emerald-700">← Dashboard</Link><h1 className="mt-2 text-2xl font-semibold text-emerald-900">Messages</h1></div></div>{!conversationId ? <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-ink-600">Accept a friend request to start a chat.</div> : <ChatClient conversationId={conversationId} userId={user.id} />}</div></main>;
}
