"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 30;

// Login re-uses the same Supabase phone-OTP mechanism as signup, but never
// creates a profile — if verifyOtp succeeds and no profile row exists yet
// (e.g. the user closed the tab mid-signup last time), we send them back
// into signup to finish, rather than silently creating a half-formed account.
export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  function startCooldown() {
    setCooldown(RESEND_SECONDS);
    const t = setInterval(() => setCooldown((s) => (s <= 1 ? (clearInterval(t), 0) : s - 1)), 1000);
  }

  async function sendOtp() {
    setError(null);
    const trimmed = phone.trim();
    if (!trimmed.startsWith("+") || trimmed.replace(/\D/g, "").length < 8) {
      setError("Enter your full phone number including country code, e.g. +919876543210.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: trimmed });
    setBusy(false);
    if (err) {
      setError(
        err.message?.toLowerCase().includes("rate limit")
          ? "Too many attempts. Please wait a few minutes."
          : `Could not send code: ${err.message}`
      );
      return;
    }
    startCooldown();
    setStep("otp");
  }

  async function verify() {
    setError(null);
    if (otp.trim().length < 4) {
      setError("Enter the code we sent you.");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: "sms",
    });
    if (err) {
      setBusy(false);
      setError(err.message?.toLowerCase().includes("expired") ? "That code expired — request a new one." : "Incorrect code.");
      return;
    }
    if (!data.user) {
      setBusy(false);
      setError("Verification succeeded but no session was returned. Please try again.");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    setBusy(false);
    if (!profile) {
      router.push("/signup?resume=1");
      return;
    }
    router.push(params.get("redirect") || "/dashboard");
  }

  return (
    <main className="min-h-screen bg-sand-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-black/10 p-6">
        <h1 className="text-lg font-semibold text-emerald-900 mb-1">Welcome back</h1>
        <p className="text-sm text-ink-400 mb-5">Log in with your phone number — we&apos;ll send a one-time code.</p>

        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">{error}</div>}

        {step === "phone" ? (
          <>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 00000 00000"
              className="w-full border border-black/10 rounded-lg px-3 py-3 text-sm mb-3 outline-none focus:border-emerald-600"
            />
            <button
              disabled={busy}
              onClick={sendOtp}
              className="w-full bg-emerald-900 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              className="w-full border border-black/10 rounded-lg px-3 py-3 text-sm mb-3 outline-none focus:border-emerald-600"
            />
            <button
              disabled={busy}
              onClick={verify}
              className="w-full bg-emerald-900 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50 mb-2"
            >
              {busy ? "Verifying…" : "Verify & Log In"}
            </button>
            <button
              disabled={cooldown > 0}
              onClick={sendOtp}
              className="w-full text-xs text-emerald-700 font-semibold disabled:text-ink-400"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
