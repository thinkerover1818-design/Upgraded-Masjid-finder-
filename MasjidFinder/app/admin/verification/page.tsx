import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server Action — runs on the server, under the signed-in admin's own
// session, so RLS's is_admin()/admin_covers_country() checks are what
// actually authorize this (middleware.ts only gates page access; this is
// the server-side enforcement the spec requires, not a client-side check).
async function decide(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as "verified" | "rejected";
  const notes = String(formData.get("notes") ?? "");
  const entityType = String(formData.get("entity_type"));
  const entityId = String(formData.get("entity_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("verification_requests")
    .update({ status: decision, reviewed_by: user.id, admin_notes: notes || null, decided_at: new Date().toISOString() })
    .eq("id", id);

  if (!error) {
    // Reflect the decision onto the actual entity so the public badge updates.
    const table = entityType === "profile" ? "profiles" : entityType === "masjid" ? "masjids" : "madrasas";
    await supabase.from(table).update({ verification_status: decision }).eq("id", entityId);

    await supabase.from("admin_audit_logs").insert({
      admin_profile_id: user.id,
      action: decision === "verified" ? "verify_entity" : "reject_verification",
      target_entity_type: entityType,
      target_entity_id: entityId,
      after_state: { status: decision, notes },
    });
  }

  revalidatePath("/admin/verification");
}

export default async function VerificationQueuePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <main className="p-6 text-sm text-ink-600">Sign in as an admin to view this page.</main>;
  }

  const { data: adminRow } = await supabase.from("admin_users").select("admin_role").eq("profile_id", user.id).maybeSingle();
  if (!adminRow) {
    // Belt-and-suspenders: middleware already blocks this route for non-admins,
    // but RLS + this check mean the page itself never trusts routing alone.
    return <main className="p-6 text-sm text-red-700">Your account is not an admin.</main>;
  }

  const { data: requests, error } = await supabase
    .from("verification_requests")
    .select("id, entity_type, entity_id, submitted_documents, status, admin_notes, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-emerald-900 mb-4">Verification Queue</h1>
      {error && <p className="text-sm text-red-700 mb-4">Could not load queue: {error.message}</p>}
      {!error && (requests?.length ?? 0) === 0 && <p className="text-sm text-ink-400">No pending verification requests.</p>}
      <ul className="flex flex-col gap-4">
        {(requests ?? []).map((r) => (
          <li key={r.id} className="rounded-xl border border-black/10 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900 mb-1">
              {r.entity_type} · {r.entity_id.slice(0, 8)}
            </p>
            <p className="text-xs text-ink-400 mb-3">
              Submitted {new Date(r.created_at).toLocaleString()} · {Array.isArray(r.submitted_documents) ? r.submitted_documents.length : 0}{" "}
              document(s)
            </p>
            <form action={decide} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entity_type" value={r.entity_type} />
              <input type="hidden" name="entity_id" value={r.entity_id} />
              <textarea
                name="notes"
                placeholder="Internal admin notes (never shown publicly)"
                className="border border-black/10 rounded-lg p-2 text-xs"
                rows={2}
              />
              <div className="flex gap-2">
                <button name="decision" value="verified" className="bg-emerald-900 text-white text-xs font-semibold rounded-lg px-3 py-2">
                  Approve
                </button>
                <button name="decision" value="rejected" className="border border-red-300 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                  Reject
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
