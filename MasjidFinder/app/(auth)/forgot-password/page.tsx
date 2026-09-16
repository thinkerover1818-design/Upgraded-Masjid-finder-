"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  async function sendReset(event: React.FormEvent) { event.preventDefault(); setError(null); setMessage(null); if (!email.trim()) { setError("Enter your email address."); return; } setBusy(true); const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` }); setBusy(false); if (authError) setError(authError.message); else setMessage("If an account exists for this email, a password reset link has been sent."); }
  return <main className="min-h-screen bg-sand-50 flex items-center justify-center p-6"><form onSubmit={sendReset} className="w-full max-w-sm bg-white rounded-2xl border border-black/10 p-6"><h1 className="text-lg font-semibold text-emerald-900 mb-1">Forgot Password?</h1><p className="text-sm text-ink-400 mb-5">Enter your email and we will send a secure reset link.</p>{error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mb-4 text-sm text-emerald-700">{message}</p>}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full border rounded-lg p-3 text-sm mb-3" /><button disabled={busy} className="w-full bg-emerald-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</button><Link href="/login" className="block text-center text-sm text-emerald-700 font-semibold mt-4">Back to login</Link></form></main>;
}