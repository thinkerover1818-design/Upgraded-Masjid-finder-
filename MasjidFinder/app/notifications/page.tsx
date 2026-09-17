import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationActions from "./NotificationActions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/notifications");
  const { data: notifications, error } = await supabase.from("notifications").select("id,profile_id,type,title,body,data,is_read,created_at").order("created_at", { ascending: false }).limit(50);
  const actorIds = (notifications ?? []).map((notification: any) => notification.data?.actor_id).filter(Boolean);
  const { data: actors } = actorIds.length ? await supabase.from("public_profile_cards").select("id,full_name,profile_picture_url").in("id", actorIds) : { data: [] };
  const actorMap = new Map<string, any>((actors ?? []).map((actor: any) => [actor.id, actor]));
  return <main className="min-h-screen bg-sand-50 p-5 sm:p-8"><div className="mx-auto max-w-2xl"><header className="mb-6"><Link href="/" className="text-sm font-semibold text-emerald-700">Home</Link><h1 className="mt-3 text-2xl font-semibold text-emerald-900">Notifications</h1><p className="mt-1 text-sm text-ink-500">Friend requests and connection updates appear here.</p></header>{error ? <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error.message}</p> : !notifications?.length ? <p className="rounded-xl border border-black/10 bg-white p-6 text-sm text-ink-500">You have no notifications yet.</p> : <div className="space-y-3">{notifications.map((notification: any) => { const actor = actorMap.get(notification.data?.actor_id); const pendingRequest = notification.type === "connection_request" && notification.data?.connection_id && !notification.is_read; return <article key={notification.id} className={`rounded-xl border border-black/10 bg-white p-4 ${notification.is_read ? "opacity-75" : ""}`}><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-100 text-xs font-bold text-emerald-900">{actor?.profile_picture_url ? <img src={actor.profile_picture_url} alt="" className="h-full w-full object-cover" /> : (actor?.full_name?.[0] ?? "!")}</div><div className="min-w-0 flex-1"><p className="font-semibold text-emerald-900">{actor?.full_name ? `${actor.full_name}: ` : ""}{notification.title}</p><p className="mt-1 text-sm text-ink-600">{notification.body}</p><p className="mt-2 text-xs text-ink-400">{new Date(notification.created_at).toLocaleString()}</p>{pendingRequest && <NotificationActions notificationId={notification.id} connectionId={notification.data.connection_id} />}</div></div></article>; })}</div>}</div></main>;
}