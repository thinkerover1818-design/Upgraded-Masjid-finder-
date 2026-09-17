"use client";

import { useState } from "react";

export default function PlanEnquiryForm({ planId, whatsappMessage }: { planId: string; whatsappMessage: string }) {
  const [method, setMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("busy");
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId, contactMethod: method, whatsappMessage }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
    setMessage(response.ok ? "Enquiry sent. We will contact you shortly." : result.error ?? "Could not send enquiry.");
    setState(response.ok ? "done" : "error");
  }

  if (state === "done") return <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>;
  return <form onSubmit={submit} className="mt-6 border-t border-black/10 pt-4">
    <label className="text-xs font-semibold text-ink-600">Preferred contact
      <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
        <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
      </select>
    </label>
    {state === "error" && <p className="mt-2 text-xs text-red-700">{message}</p>}
    <button disabled={state === "busy"} className="mt-3 w-full rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{state === "busy" ? "Sending…" : "Enquire about this plan"}</button>
  </form>;
}