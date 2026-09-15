"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocationCascade } from "@/lib/hooks/useLocationCascade";
import { validateInternationalPhone } from "@/lib/validation/phone";

type AccountType = "imam" | "hafiz_qari" | "moulvi_scholar" | "teacher" | "masjid" | "madrasa" | "event_organizer";
type RoleType =
  | "masjid_for_taraweeh" | "hafiz_qari_for_taraweeh" | "masjid_for_imam" | "imam_for_masjid"
  | "teacher_for_madrasa" | "madrasa_for_teacher" | "moulvi_for_events" | "moulvi_for_nikah";

const ACCOUNT_TYPES: { value: AccountType; label: string; institutional?: boolean }[] = [
  { value: "imam", label: "Imam" },
  { value: "hafiz_qari", label: "Hafiz / Qari" },
  { value: "moulvi_scholar", label: "Moulvi / Scholar" },
  { value: "teacher", label: "Teacher" },
  { value: "masjid", label: "Masjid", institutional: true },
  { value: "madrasa", label: "Madrasa", institutional: true },
  { value: "event_organizer", label: "Event Organizer", institutional: true },
];

// Individual-role checkboxes shown once account types are picked — this is
// what lets one person be Hafiz + Qari + Imam + Teacher + Moulvi on ONE
// account, satisfying the "one account, multiple roles" requirement.
const ROLE_OPTIONS_BY_ACCOUNT_TYPE: Record<string, { value: RoleType; label: string }[]> = {
  imam: [{ value: "imam_for_masjid", label: "Imam For Masjid" }],
  hafiz_qari: [{ value: "hafiz_qari_for_taraweeh", label: "Hafiz/Qari For Taraweeh" }],
  teacher: [{ value: "madrasa_for_teacher", label: "Teacher For Madrasa" }],
  moulvi_scholar: [
    { value: "moulvi_for_events", label: "Scholar For Islamic Events" },
    { value: "moulvi_for_nikah", label: "Moulvi For Nikah" },
  ],
};

type Step = "account_type" | "roles" | "profile" | "location" | "phone" | "otp" | "done";

const RESEND_SECONDS = 30;

export default function SignupWizard() {
  const router = useRouter();
  const supabase = createClient();
  const { countries, states, cities, loadingCountries, loadingStates, loadingCities, loadStates, loadCities } =
    useLocationCascade();

  const [step, setStep] = useState<Step>("account_type");
  const [accountTypes, setAccountTypes] = useState<Set<AccountType>>(new Set());
  const [roles, setRoles] = useState<Set<RoleType>>(new Set());
  const [fullName, setFullName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = useMemo(() => countries.find((c) => c.id === countryId), [countries, countryId]);
  const hasInstitutionalType = useMemo(
    () => [...accountTypes].some((t) => ACCOUNT_TYPES.find((a) => a.value === t)?.institutional),
    [accountTypes]
  );
  const availableRoleOptions = useMemo(() => {
    const opts: { value: RoleType; label: string }[] = [];
    for (const t of accountTypes) {
      for (const r of ROLE_OPTIONS_BY_ACCOUNT_TYPE[t] ?? []) opts.push(r);
    }
    return opts;
  }, [accountTypes]);

  function toggleAccountType(t: AccountType) {
    setAccountTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }
  function toggleRole(r: RoleType) {
    setRoles((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  async function onCountryChange(id: string) {
    setCountryId(id);
    setStateId("");
    setCityId("");
    await loadStates(id || null);
  }
  async function onStateChange(id: string) {
    setStateId(id);
    setCityId("");
    await loadCities(countryId || null, id || null);
  }

  function startResendTimer() {
    setResendCooldown(RESEND_SECONDS);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    setError(null);
    const phoneCheck = validateInternationalPhone(rawPhone, selectedCountry?.iso2 ?? "");
    if (!phoneCheck.valid || !phoneCheck.e164) {
      setError(phoneCheck.error ?? "Invalid phone number.");
      return;
    }
    setBusy(true);
    // REAL Supabase phone-OTP call. If no SMS provider is configured in the
    // Supabase dashboard (Authentication > Providers > Phone), this fails
    // with a real error surfaced below — it never pretends to succeed.
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: phoneCheck.e164 });
    setBusy(false);
    if (otpError) {
      if (otpError.message?.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a few minutes before requesting another code.");
      } else {
        setError(`Could not send OTP: ${otpError.message}`);
      }
      return;
    }
    setOtpSentAt(Date.now());
    startResendTimer();
    setStep("otp");
  }

  async function verifyOtp() {
    setError(null);
    if (!otp || otp.trim().length < 4) {
      setError("Enter the code we sent you.");
      return;
    }
    const phoneCheck = validateInternationalPhone(rawPhone, selectedCountry?.iso2 ?? "");
    if (!phoneCheck.e164) {
      setError("Something went wrong with the phone number — go back and re-enter it.");
      return;
    }
    setBusy(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneCheck.e164,
      token: otp.trim(),
      type: "sms",
    });
    if (verifyError) {
      setBusy(false);
      if (verifyError.message?.toLowerCase().includes("expired")) {
        setError("That code has expired. Request a new one.");
      } else {
        setError("Incorrect code. Please try again.");
      }
      return;
    }
    if (!data.user) {
      setBusy(false);
      setError("Verification succeeded but no session was returned. Please try logging in.");
      return;
    }

    // Duplicate-account guard: if a profile already exists for this auth
    // user (e.g. they previously completed signup and are re-verifying),
    // send them straight to their dashboard instead of re-creating a row.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (existingProfile) {
      setBusy(false);
      router.push("/dashboard");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      country_id: countryId,
      state_id: stateId || null,
      city_id: cityId || null,
      phone_e164: phoneCheck.e164,
      phone_country_id: countryId,
      phone_verified: true,
    });

    if (profileError) {
      setBusy(false);
      // Network/DB errors surface honestly rather than a fake "success" screen.
      setError(`Your phone is verified, but we could not finish creating your profile: ${profileError.message}. Please retry.`);
      return;
    }

    if (accountTypes.size > 0) {
      await supabase.from("profile_account_types").insert(
        [...accountTypes].map((account_type) => ({ profile_id: data.user!.id, account_type }))
      );
    }
    if (roles.size > 0) {
      await supabase.from("profile_roles").insert(
        [...roles].map((role) => ({ profile_id: data.user!.id, role }))
      );
    }
    if (referralCode.trim().length > 0) {
      await supabase.rpc("fn_apply_referral", {
        p_referred_id: data.user.id,
        p_referral_code: referralCode.trim(),
      });
    }

    setBusy(false);
    setStep("done");
    setTimeout(() => {
      router.push(hasInstitutionalType ? "/dashboard/institutions/new" : "/dashboard");
    }, 1200);
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <StepIndicator step={step} />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
          {error}
        </div>
      )}

      {step === "account_type" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-1">What type of account are you creating?</h2>
          <p className="text-sm text-ink-400 mb-4">Select all that apply — one account can hold multiple roles.</p>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleAccountType(t.value)}
                aria-pressed={accountTypes.has(t.value)}
                className={`border rounded-lg p-3 text-sm text-left transition ${
                  accountTypes.has(t.value)
                    ? "border-emerald-600 bg-emerald-100 text-emerald-900 font-semibold"
                    : "border-gray-200 text-ink-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            disabled={accountTypes.size === 0}
            onClick={() => setStep(availableRoleOptions.length > 0 ? "roles" : "profile")}
            className="mt-6 w-full rounded-lg bg-emerald-900 text-white font-semibold py-3 disabled:opacity-40"
          >
            Continue
          </button>
        </section>
      )}

      {step === "roles" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-1">Your specific roles</h2>
          <p className="text-sm text-ink-400 mb-4">
            Select every role you offer — e.g. Hafiz/Qari + Imam + Teacher can all live on one profile.
          </p>
          <div className="flex flex-col gap-2">
            {availableRoleOptions.map((r) => (
              <label key={r.value} className="flex items-center gap-3 border rounded-lg p-3 text-sm">
                <input type="checkbox" checked={roles.has(r.value)} onChange={() => toggleRole(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setStep("account_type")} className="flex-1 rounded-lg border py-3 font-semibold">
              Back
            </button>
            <button onClick={() => setStep("profile")} className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold">
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "profile" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-4">Your name</h2>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full border rounded-lg p-3 text-sm mb-6"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(availableRoleOptions.length > 0 ? "roles" : "account_type")} className="flex-1 rounded-lg border py-3 font-semibold">
              Back
            </button>
            <button
              disabled={fullName.trim().length < 2}
              onClick={() => setStep("location")}
              className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "location" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-1">Where are you based?</h2>
          <p className="text-sm text-ink-400 mb-4">Every country works the same way here — nothing is India-only.</p>

          <label className="text-xs font-semibold text-ink-600">Country</label>
          <select
            value={countryId}
            onChange={(e) => onCountryChange(e.target.value)}
            disabled={loadingCountries}
            className="w-full border rounded-lg p-3 text-sm mb-3"
          >
            <option value="">{loadingCountries ? "Loading countries…" : "Select country"}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag_emoji} {c.name}
              </option>
            ))}
          </select>

          {states.length > 0 && (
            <>
              <label className="text-xs font-semibold text-ink-600">State / Province</label>
              <select
                value={stateId}
                onChange={(e) => onStateChange(e.target.value)}
                disabled={loadingStates}
                className="w-full border rounded-lg p-3 text-sm mb-3"
              >
                <option value="">{loadingStates ? "Loading…" : "Select state / province"}</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </>
          )}

          {cities.length > 0 && (
            <>
              <label className="text-xs font-semibold text-ink-600">City</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={loadingCities}
                className="w-full border rounded-lg p-3 text-sm mb-3"
              >
                <option value="">{loadingCities ? "Loading…" : "Select city"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}

          <label className="text-xs font-semibold text-ink-600">Referral code (optional)</label>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="e.g. AB12CD34"
            className="w-full border rounded-lg p-3 text-sm mb-6 uppercase"
          />

          <div className="flex gap-2">
            <button onClick={() => setStep("profile")} className="flex-1 rounded-lg border py-3 font-semibold">
              Back
            </button>
            <button
              disabled={!countryId}
              onClick={() => setStep("phone")}
              className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "phone" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-1">Verify your phone number</h2>
          <p className="text-sm text-ink-400 mb-4">We'll text you a one-time code.</p>
          <div className="flex gap-2 mb-6">
            <div className="border rounded-lg p-3 text-sm bg-gray-50 text-ink-600 whitespace-nowrap">
              {selectedCountry?.calling_code ?? "+--"}
            </div>
            <input
              value={rawPhone}
              onChange={(e) => setRawPhone(e.target.value)}
              placeholder="Phone number"
              inputMode="tel"
              className="flex-1 border rounded-lg p-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("location")} className="flex-1 rounded-lg border py-3 font-semibold">
              Back
            </button>
            <button
              disabled={busy || !rawPhone}
              onClick={sendOtp}
              className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        </section>
      )}

      {step === "otp" && (
        <section>
          <h2 className="text-lg font-semibold text-emerald-900 mb-1">Enter the code</h2>
          <p className="text-sm text-ink-400 mb-4">
            Sent to {selectedCountry?.calling_code} {rawPhone}
          </p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={8}
            className="w-full border rounded-lg p-3 text-sm mb-3 tracking-widest text-center text-lg"
          />
          <button
            disabled={resendCooldown > 0 || busy}
            onClick={sendOtp}
            className="text-sm text-emerald-700 font-semibold mb-6 disabled:text-ink-400"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
          <div className="flex gap-2">
            <button onClick={() => setStep("phone")} className="flex-1 rounded-lg border py-3 font-semibold">
              Back
            </button>
            <button
              disabled={busy}
              onClick={verifyOtp}
              className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Verify & Create Account"}
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="text-center py-10">
          <p className="text-emerald-900 font-semibold text-lg">Account created 🎉</p>
          <p className="text-sm text-ink-400 mt-1">Taking you to your dashboard…</p>
        </section>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["account_type", "roles", "profile", "location", "phone", "otp"];
  const idx = steps.indexOf(step);
  if (idx === -1) return null;
  return (
    <div className="flex gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-emerald-700" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}
