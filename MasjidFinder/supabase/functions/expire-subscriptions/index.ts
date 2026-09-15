// Deno Edge Function. Deploy with:
//   supabase functions deploy expire-subscriptions
// Schedule (Supabase dashboard > Edge Functions > Cron, or `supabase functions schedule`):
//   hourly, e.g. "0 * * * *"
// Protects itself with CRON_SECRET so it can't be triggered by an arbitrary
// public request — the scheduler (or your own curl) must send it as a
// bearer token, matching the CRON_SECRET env var set in .env.example.
//
// This calls the real fn_expire_subscriptions() Postgres function (see
// supabase/migrations/0011_functions_triggers.sql) — it does not simulate
// expiry client-side, and it does not silently swallow errors.

// @ts-nocheck — Deno runtime types aren't available in this Node-oriented repo checkout.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured for this function." }),
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.rpc("fn_expire_subscriptions");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ expired_count: data, ran_at: new Date().toISOString() }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
