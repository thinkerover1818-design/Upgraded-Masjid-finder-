"use client";

import { useState } from "react";

export default function NotificationActions({ notificationId, connectionId }: { notificationId: string; connectionId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setBusy(true); setError(null);
    const response = await fetch("/api/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "accept", connectionId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not accept request."); setBusy(false); return; }
    await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notificationId }) });
    window.location.href = result.conversationId ? `/chat?conversation=${result.conversationId}` : "/chat";
  }
  return <div className="mt-3">{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : <button type="button" onClick={accept} disabled={busy} className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Accepting..." : "Accept and chat"}</button>}</div>;
}