"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocationCascade } from "@/lib/hooks/useLocationCascade";

type AccountType = "imam" | "masjid" | "madrasa";
type Step = "account" | "details" | "location" | "saving" | "done";
const firqahs = ["sunni_hanafi", "sunni_shafii", "sunni_maliki", "sunni_hanbali", "salafi_ahle_hadith", "shia", "other", "prefer_not_to_say"];
const firqahLabels: Record<string, string> = { sunni_hanafi: "Sunni Hanafi", sunni_shafii: "Sunni Shafii", sunni_maliki: "Sunni Maliki", sunni_hanbali: "Sunni Hanbali", salafi_ahle_hadith: "Salafi / Ahle Hadith", shia: "Shia", other: "Other", prefer_not_to_say: "Prefer not to say" };
const qualifications = ["hafiz", "qari", "aalim", "mufti", "imam", "teacher", "moulvi", "other"];
const qualificationLabels: Record<string, string> = { hafiz: "Hafiz", qari: "Qari", aalim: "Aalim", mufti: "Mufti", imam: "Imam", teacher: "Teacher", moulvi: "Moulvi", other: "Other" };
const imamRoles = [["imam_for_masjid", "Imam for Masjid"], ["hafiz_qari_for_taraweeh", "Hafiz/Qari for Taraweeh"], ["moulvi_for_nikah", "Moulvi for Nikah"], ["teacher_for_madrasa", "Teacher for Madarsa"], ["moulvi_for_events", "Scholar/Moulvi for Islamic Events/Jalsa"]] as const;

export default function SignupWizard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient() as any, []);
  const { countries, states, cities, loadingCountries, loadingStates, loadingCities, loadStates, loadCities } = useLocationCascade();
  const [step, setStep] = useState<Step>("account");
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(""); const [age, setAge] = useState(""); const [firqah, setFirqah] = useState(""); const [address, setAddress] = useState(""); const [profilePictureUrl, setProfilePictureUrl] = useState(""); const [qualification, setQualification] = useState(""); const [qualificationCustom, setQualificationCustom] = useState(""); const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [pictureFile, setPictureFile] = useState<File | null>(null); const [recitationFile, setRecitationFile] = useState<File | null>(null);
  const [countryId, setCountryId] = useState(""); const [stateId, setStateId] = useState(""); const [cityId, setCityId] = useState(""); const [masjidName, setMasjidName] = useState(""); const [representativeName, setRepresentativeName] = useState(""); const [masjidPurpose, setMasjidPurpose] = useState(""); const [madrasaName, setMadrasaName] = useState(""); const [holderName, setHolderName] = useState(""); const [teacherType, setTeacherType] = useState(""); const [teacherTypeCustom, setTeacherTypeCustom] = useState(""); const [salary, setSalary] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }: any) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });
    return () => { active = false; };
  }, [supabase.auth]);
  const selectedCountry = useMemo(() => countries.find((country) => country.id === countryId), [countries, countryId]);

  async function startGoogle() {
    setError(null); setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (authError) { setBusy(false); setError(authError.message); }
  }
  async function startEmailSignup() {
    setError(null); setSuccess(null);
    if (!email.trim() || password.length < 8 || password !== confirmPassword) {
      setError("Enter a valid email, an 8-character password, and matching passwords.");
      return;
    }
    setBusy(true);
    const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (authError) { setError(authError.message); return; }
    if (data.session?.user) { setUserId(data.session.user.id); setStep("account"); return; }
    setError("Account was created, but Supabase did not return a session. Disable email confirmations in the linked Supabase Auth settings, then try again.");
  }
  function toggleRole(role: string) { setSelectedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); }
  async function saveProfile() {
    if (!userId || !accountType) { setError("Please sign in first, then choose an account type."); return; }
    setError(null); setBusy(true); setStep("saving");
    const profile = { full_name: accountType === "imam" ? fullName : accountType === "masjid" ? representativeName : holderName, age, address, country_id: countryId, state_id: stateId, city_id: cityId, firqah, profile_picture_url: profilePictureUrl };
    const masjid = accountType === "masjid" ? { masjid_name: masjidName, address, representative_name: representativeName, firqah, purpose: masjidPurpose } : null;
    const madrasa = accountType === "madrasa" ? { madrasa_name: madrasaName, holder_name: holderName, address, required_teacher_type: teacherType, required_teacher_type_custom: teacherTypeCustom, salary } : null;
    const { error: saveError } = await supabase.rpc("complete_google_profile", { p_account_type: accountType, p_profile: profile, p_roles: accountType === "imam" ? selectedRoles : [], p_qualification: accountType === "imam" ? qualification || null : null, p_qualification_custom: qualificationCustom, p_masjid: masjid, p_madrasa: madrasa });
    if (saveError) { setBusy(false); setStep("details"); setError(saveError.message); return; }
    if (accountType === "imam" && pictureFile) {
      const path = `${userId}/${crypto.randomUUID()}-${pictureFile.name}`;
      const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(path, pictureFile, { upsert: false });
      if (!uploadError) {
        const { data: publicImage } = supabase.storage.from("profile-pictures").getPublicUrl(path);
        await supabase.from("profiles").update({ profile_picture_url: publicImage.publicUrl }).eq("id", userId);
      }
    }
    if (accountType === "imam" && recitationFile) {
      const path = `${userId}/${crypto.randomUUID()}-${recitationFile.name}`;
      const { error: uploadError } = await supabase.storage.from("recitations").upload(path, recitationFile, { upsert: false });
      if (!uploadError) await supabase.from("recitation_files").insert({ profile_id: userId, storage_path: path, mime_type: recitationFile.type || null });
    }
    setBusy(false);
    setStep("done"); setTimeout(() => router.push("/dashboard"), 700);
  }
  const commonValid = (accountType === "imam" ? fullName.trim().length >= 2 : accountType === "masjid" ? representativeName.trim().length >= 2 : holderName.trim().length >= 2) && address.trim().length >= 3 && (accountType === "madrasa" || firqah);
  const detailsValid = accountType === "imam" ? Boolean(commonValid && age && qualification && (qualification !== "other" || qualificationCustom.trim()) && selectedRoles.length) : accountType === "masjid" ? Boolean(commonValid && masjidName && representativeName && masjidPurpose) : Boolean(commonValid && madrasaName && holderName && teacherType && (teacherType !== "other" || teacherTypeCustom.trim()));

  return <div className="max-w-lg mx-auto p-6">
    <div className="flex gap-1 mb-6">{["account", "details", "location"].map((item, index) => <div key={item} className={`h-1 flex-1 rounded-full ${["account", "details", "location"].indexOf(step) >= index ? "bg-emerald-700" : "bg-gray-200"}`} />)}</div>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">{error}</div>}{success && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm p-3">{success}</div>}
    {!authReady && <p className="rounded-xl border border-black/10 bg-white p-5 text-sm text-ink-400">Checking your session…</p>}
    {authReady && !userId && <section className="rounded-xl border border-emerald-900/15 bg-white p-5"><h1 className="text-xl font-semibold text-emerald-900">Create your MasjidFinder account</h1><p className="text-sm text-ink-400 mt-1 mb-5">Create an account with email and password, or continue with Google.</p><Input label="Email *" value={email} setValue={setEmail} type="email" /><Input label="Password *" value={password} setValue={setPassword} type="password" /><Input label="Confirm password *" value={confirmPassword} setValue={setConfirmPassword} type="password" /><button disabled={busy} onClick={startEmailSignup} className="w-full bg-emerald-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50">{busy ? "Creating account…" : "Create account with email"}</button><div className="my-4 text-center text-xs text-ink-400">or</div><button disabled={busy} onClick={startGoogle} className="w-full border border-black/15 rounded-lg py-3 font-semibold disabled:opacity-50">{busy ? "Opening Google…" : "Continue with Google"}</button></section>}
    {userId && step === "account" && <section><h2 className="text-lg font-semibold text-emerald-900 mb-1">Choose your account type</h2><p className="text-sm text-ink-400 mb-4">Select the profile you want to create.</p><div className="grid grid-cols-3 gap-2">{(["masjid", "imam", "madrasa"] as AccountType[]).map((type) => <button key={type} type="button" onClick={() => setAccountType(type)} className={`border rounded-lg p-4 text-sm capitalize ${accountType === type ? "border-emerald-600 bg-emerald-100 text-emerald-900 font-semibold" : "border-gray-200"}`}>{type}</button>)}</div><button disabled={!accountType} onClick={() => setStep("details")} className="mt-6 w-full rounded-lg bg-emerald-900 text-white font-semibold py-3 disabled:opacity-40">Next</button></section>}
    {userId && step === "details" && <section><h2 className="text-lg font-semibold text-emerald-900 mb-4">{accountType === "imam" ? "Imam profile" : accountType === "masjid" ? "Masjid details" : "Madarsa details"}</h2>{accountType === "imam" ? <><Input label="Full Name *" value={fullName} setValue={setFullName} /><Input label="Age *" type="number" value={age} setValue={setAge} /><Select label="Firqah / Maslak *" value={firqah} setValue={setFirqah} options={firqahs.map((value) => ({ value, label: firqahLabels[value] }))} /><Input label="Address *" value={address} setValue={setAddress} /><FileInput label="Profile picture (optional)" accept="image/jpeg,image/png,image/webp" setFile={setPictureFile} /><Select label="Qualification *" value={qualification} setValue={setQualification} options={qualifications.map((value) => ({ value, label: qualificationLabels[value] }))} />{qualification === "other" && <Input label="Qualification (manual) *" value={qualificationCustom} setValue={setQualificationCustom} />}<FileInput label="Quran recitation / voice file (optional)" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav" setFile={setRecitationFile} /><fieldset className="mb-4"><legend className="text-xs font-semibold text-ink-600 mb-2">Services / Roles *</legend>{imamRoles.map(([role, label]) => <label key={role} className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />{label}</label>)}</fieldset></> : accountType === "masjid" ? <><Input label="Masjid Name *" value={masjidName} setValue={setMasjidName} /><Input label="Holder / Committee Representative Name *" value={representativeName} setValue={setRepresentativeName} /><Select label="Firqah / Maslak *" value={firqah} setValue={setFirqah} options={firqahs.map((value) => ({ value, label: firqahLabels[value] }))} /><Input label="Address *" value={address} setValue={setAddress} /><Select label="Purpose *" value={masjidPurpose} setValue={setMasjidPurpose} options={[{ value: "masjid_for_imam", label: "Imam Required" }, { value: "masjid_for_taraweeh", label: "Taraweeh Hafiz/Qari Required" }, { value: "both", label: "Both" }]} /></> : <><Input label="Madarsa Name *" value={madrasaName} setValue={setMadrasaName} /><Input label="Holder / Representative Name *" value={holderName} setValue={setHolderName} /><Input label="Address *" value={address} setValue={setAddress} /><Select label="Required Post / Teacher Type *" value={teacherType} setValue={setTeacherType} options={[{ value: "hifz", label: "Hafiz" }, { value: "aalim_moulana", label: "Moulana / Aalim" }, { value: "islamic_studies", label: "Deeni Teacher" }, { value: "general_subject", label: "Dunyavi / Academic Teacher" }, { value: "other", label: "Other" }]} />{teacherType === "other" && <Input label="Teacher type (manual) *" value={teacherTypeCustom} setValue={setTeacherTypeCustom} />}<Input label="Salary (optional)" value={salary} setValue={setSalary} /></>}<div className="flex gap-2 mt-6"><button onClick={() => setStep("account")} className="flex-1 rounded-lg border py-3 font-semibold">Back</button><button onClick={() => { if (!detailsValid) { setError("Please complete all required fields before continuing."); return; } setError(null); setStep("location"); }} className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold">Next</button></div></section>}
    {userId && step === "location" && <section><h2 className="text-lg font-semibold text-emerald-900 mb-4">Location</h2><Select label="Country *" value={countryId} setValue={async (value) => { setCountryId(value); setStateId(""); setCityId(""); await loadStates(value || null); }} options={countries.map((country) => ({ value: country.id, label: `${country.flag_emoji} ${country.name}` }))} disabled={loadingCountries} /><Select label="State / Province" value={stateId} setValue={async (value) => { setStateId(value); setCityId(""); await loadCities(countryId || null, value || null); }} options={states.map((state) => ({ value: state.id, label: state.name }))} disabled={loadingStates || !countryId} /><Select label="City" value={cityId} setValue={setCityId} options={cities.map((city) => ({ value: city.id, label: city.name }))} disabled={loadingCities || !stateId} /><p className="text-xs text-ink-400 mb-5">{selectedCountry ? `Selected country: ${selectedCountry.name}` : "Choose your country and available region."}</p><div className="flex gap-2"><button onClick={() => setStep("details")} className="flex-1 rounded-lg border py-3 font-semibold">Back</button><button disabled={busy} onClick={() => { if (!countryId) { setError("Please select a country before saving."); return; } setError(null); saveProfile(); }} className="flex-1 rounded-lg bg-emerald-900 text-white py-3 font-semibold disabled:opacity-40">{busy ? "Saving…" : "Save profile"}</button></div></section>}
    {step === "saving" && <p className="text-center text-emerald-900 py-10">Saving your profile…</p>}{step === "done" && <p className="text-center text-emerald-900 py-10 font-semibold">Account ready. Taking you to your dashboard…</p>}
  </div>;
}

function Input({ label, value, setValue, type = "text" }: { label: string; value: string; setValue: (value: string) => void; type?: string }) { return <label className="block mb-3 text-xs font-semibold text-ink-600">{label}<input type={type} value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full border rounded-lg p-3 text-sm font-normal" /></label>; }
function FileInput({ label, accept, setFile }: { label: string; accept: string; setFile: (file: File | null) => void }) { return <label className="block mb-3 text-xs font-semibold text-ink-600">{label}<input type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 w-full border rounded-lg p-3 text-sm font-normal" /></label>; }
function Select({ label, value, setValue, options, disabled = false }: { label: string; value: string; setValue: (value: string) => void | Promise<void>; options: { value: string; label: string }[]; disabled?: boolean }) { return <label className="block mb-3 text-xs font-semibold text-ink-600">{label}<select disabled={disabled} value={value} onChange={(event) => void setValue(event.target.value)} className="mt-1 w-full border rounded-lg p-3 text-sm font-normal"><option value="">{disabled ? "Loading…" : "Select"}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }