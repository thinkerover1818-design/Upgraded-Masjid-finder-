"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChatClient({ conversationId, userId }: { conversationId: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<any[]>([]); const [content, setContent] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`).then((response) => response.json()).then((result) => setMessages(result.messages ?? []));
    const channel = supabase.channel(`conversation:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => setMessages((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new])).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, supabase]);
  async function sendMessage(event: React.FormEvent) { event.preventDefault(); if (!content.trim()) return; setBusy(true); setError(null); const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId, content }) }); const result = await response.json(); setBusy(false); if (!response.ok) { setError(result.error ?? "Could not send message."); return; } setMessages((current) => current.some((message) => message.id === result.message.id) ? current : [...current, result.message]); setContent(""); }
  return <section className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-4 max-h-[28rem] min-h-[16rem] space-y-2 overflow-y-auto rounded-lg bg-sand-50 p-3">{!messages.length && <p className="text-sm text-ink-400">No messages yet. Start the conversation.</p>}{messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.sender_id === userId ? "ml-auto bg-emerald-900 text-white" : "bg-white text-ink-900"}`}>{message.content}</div>)}</div>{error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}<form onSubmit={sendMessage} className="flex gap-2"><input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write a message" className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-3 text-sm" /><button disabled={busy} className="rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send"}</button></form></section>;
}
