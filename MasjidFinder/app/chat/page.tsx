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
  const { data: acceptedConnections } = await supabase.from("connections").select("id,requester_id,recipient_id").eq("status", "accepted").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  const { data: participants } = conversationIds.length ? await supabase.from("conversation_participants").select("conversation_id,profile_id").in("conversation_id", conversationIds).neq("profile_id", user.id) : { data: [] };
  const otherIds = Array.from(new Set((acceptedConnections ?? []).map((connection: any) => connection.requester_id === user.id ? connection.recipient_id : connection.requester_id)));
  const { data: profiles } = otherIds.length ? await supabase.from("public_profile_cards").select("id,username,full_name,profile_picture_url,verification_status,country_name,flag_emoji").in("id", otherIds) : { data: [] };
  const profileMap = new Map<string, { username?: string | null; full_name: string; profile_picture_url?: string | null; verification_status: string | null; country_name?: string | null; flag_emoji?: string | null }>((profiles ?? []).map((profile: any) => [profile.id, profile]));
  const unreadCounts = await Promise.all((conversations ?? []).map(async (conversation: any) => {
    const membership = (memberships ?? []).find((item: any) => item.conversation_id === conversation.id);
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversation.id).neq("sender_id", user.id);
    if (membership?.last_read_at) query = query.gt("created_at", membership.last_read_at);
    const result = await query;
    return [conversation.id, result.count ?? 0] as const;
  }));
  const unreadMap = new Map<string, number>(unreadCounts);
  const conversationMap = new Map<string, any>((conversations ?? []).map((conversation: any) => [conversation.connection_id, conversation]));
  const conversationId = searchParams.conversation || conversations?.[0]?.id;
  const activeConversation = (conversations ?? []).find((conversation: any) => conversation.id === conversationId);
  const activeConnection = (acceptedConnections ?? []).find((connection: any) => connection.id === activeConversation?.connection_id);
  const activeFriendId = activeConnection ? (activeConnection.requester_id === user.id ? activeConnection.recipient_id : activeConnection.requester_id) : null;
  return <main className="min-h-screen bg-sand-50 p-4 sm:p-6"><div className="mx-auto max-w-5xl"><div className="mb-5 flex items-center justify-between"><div><Link href="/dashboard" className="text-sm font-semibold text-emerald-700">← Dashboard</Link><h1 className="mt-2 text-2xl font-semibold text-emerald-900">Messages</h1><p className="mt-1 text-sm text-ink-500">Your friends, in one place.</p></div></div><div className="grid gap-4 md:grid-cols-[19rem_1fr]">{acceptedConnections?.length ? <nav className="rounded-2xl border border-black/10 bg-white p-2" aria-label="Friend list">{acceptedConnections.map((connection: any) => { const friendId = connection.requester_id === user.id ? connection.recipient_id : connection.requester_id; const profile = profileMap.get(friendId); const conversation = conversationMap.get(connection.id); const active = conversation?.id === conversationId; return <Link key={connection.id} href={conversation ? `/chat?conversation=${conversation.id}` : `/profile/${friendId}`} className={`flex items-center gap-3 rounded-xl p-3 ${active ? "bg-emerald-100" : "hover:bg-sand-50"}`}><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-100 text-sm font-bold text-emerald-900">{profile?.profile_picture_url ? <img src={profile.profile_picture_url} alt="" className="h-full w-full object-cover" /> : profile?.full_name?.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate whitespace-nowrap text-sm font-semibold text-emerald-900">{profile?.full_name ?? "Friend"}</span>{conversation && unreadMap.get(conversation.id) ? <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-emerald-950">{unreadMap.get(conversation.id)}</span> : null}</div><span className="block truncate text-xs text-ink-400">@{profile?.username ?? "friend"} · {profile?.flag_emoji ?? ""} {profile?.country_name ?? "Connected"}</span></div></Link>; })}</nav> : <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-ink-600">Accept a friend request to start chatting.</div>}{!conversationId ? <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-ink-600">Select a friend to open the conversation.</div> : <ChatClient conversationId={conversationId} userId={user.id} profile={activeFriendId ? profileMap.get(activeFriendId) : null} />}</div></div></main>;
}
