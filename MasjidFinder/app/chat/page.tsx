import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: { conversation?: string } }) {
  const supabase = createClient() as any; const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login?redirect=/chat");
  const { data: memberships } = await supabase.from("conversation_participants").select("conversation_id,last_read_at").eq("profile_id", user.id).eq("is_deleted_for_user", false);
  const conversationIds = (memberships ?? []).map((item: any) => item.conversation_id);
  const { data: conversations } = conversationIds.length ? await supabase.from("conversations").select("id,connection_id,created_at").in("id", conversationIds).order("created_at", { ascending: false }) : { data: [] };
  const { data: participants } = conversationIds.length ? await supabase.from("conversation_participants").select("conversation_id,profile_id").in("conversation_id", conversationIds).neq("profile_id", user.id) : { data: [] };
  const otherIds = (participants ?? []).map((item: any) => item.profile_id);
  const { data: profiles } = otherIds.length ? await supabase.from("public_profile_cards").select("id,full_name,profile_picture_url,verification_status").in("id", otherIds) : { data: [] };
  const profileMap = new Map<string, { full_name: string; verification_status: string | null }>((profiles ?? []).map((profile: any) => [profile.id, profile]));
  const unreadCounts = await Promise.all((conversations ?? []).map(async (conversation: any) => {
    const membership = (memberships ?? []).find((item: any) => item.conversation_id === conversation.id);
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversation.id).neq("sender_id", user.id);
    if (membership?.last_read_at) query = query.gt("created_at", membership.last_read_at);
    const result = await query;
    return [conversation.id, result.count ?? 0] as const;
  }));
  const unreadMap = new Map<string, number>(unreadCounts);
  const conversationId = searchParams.conversation || conversations?.[0]?.id;
  return <main className="min-h-screen bg-sand-50 p-6"><div className="mx-auto max-w-5xl"><div className="mb-5 flex items-center justify-between"><div><Link href="/dashboard" className="text-sm font-semibold text-emerald-700">← Dashboard</Link><h1 className="mt-2 text-2xl font-semibold text-emerald-900">Messages</h1><p className="mt-1 text-sm text-ink-500">Your accepted connections, in one place.</p></div></div><div className="grid gap-4 md:grid-cols-[18rem_1fr]">{conversations?.length ? <nav className="rounded-xl border border-black/10 bg-white p-2" aria-label="Conversation list">{conversations.map((conversation: any) => { const participant = participants?.find((item: any) => item.conversation_id === conversation.id); const profile = participant ? profileMap.get(participant.profile_id) : null; const active = conversation.id === conversationId; return <Link key={conversation.id} href={`/chat?conversation=${conversation.id}`} className={`block rounded-lg p-3 ${active ? "bg-emerald-100" : "hover:bg-sand-50"}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-emerald-900">{profile?.full_name ?? "Connection"}</span>{unreadMap.get(conversation.id) ? <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-emerald-950">{unreadMap.get(conversation.id)}</span> : null}</div><span className="text-xs text-ink-400">{profile?.verification_status === "verified" ? "✓ Verified" : "Connected"}</span></Link>; })}</nav> : null}{!conversationId ? <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-ink-600">Accept a connection request to start a chat.</div> : <ChatClient conversationId={conversationId} userId={user.id} />}</div></div></main>;
}
