# MasjidFinder — Global Islamic Professional Network (Phase 1)

This is an upgrade of the original 3-file concept (`architecture.md`, `database-schema.sql`,
`homepage-prototype.jsx`) into a real, runnable Next.js + Supabase project. It is **not** the
full 37-section spec — that is a multi-month build. This README says exactly what works,
what's schema-ready-but-has-no-screen, and what needs external configuration before it works
at all.

---

## 1. What was in the original ZIP

Three documents, no application code:
- `architecture.md` — a genuinely good design doc, kept as the blueprint.
- `database-schema.sql` — a v1 stub: free-text `country`/`state`/`city` columns (violates the
  "no hard-coded country list" requirement), only 4 example RLS policies, triggers literally
  commented `-- omitted here for brevity`, no phone normalization, no admin roles beyond one
  table.
- `homepage-prototype.jsx` — a static visual mockup. The country dropdown was a hard-coded
  8-item JS array; Sign Up / Log In / Search did nothing.

## 2. What this upgrade actually is

A working Next.js 14 (App Router) + Supabase project:

- **Database**: 14 migrations (`supabase/migrations/0001`–`0014`), ~2,500 lines, fully
  normalized, no "omitted for brevity" anywhere. Real hierarchical
  `countries → states → cities` master tables (197 countries seeded with ISO2/ISO3, calling
  code, currency code/name/symbol, IANA timezone, flag emoji — admin-addable, zero code
  changes needed to add/rename/disable one). RLS enabled and given an explicit policy set on
  **every** table (default-deny posture, not 4 "representative" examples). All three
  listing-sync triggers (profile/masjid/madrasa → `listings`) are implemented, not stubbed.
- **Matching/search**: one generic `search_listings()` SQL function used by every category,
  exactly matching the architecture doc's "never hard-code per category" rule. Ranking
  (`rank_override → featured → boost → verified → text relevance → completeness`) cannot be
  self-manipulated — those fields are only ever written by triggers or admin/subscription RPCs.
- **Auth/signup**: a real multi-step wizard (`app/(auth)/signup`) — multi-role selection (one
  account, several professional roles), country→state→city cascade from the real tables,
  international phone validation via `libphonenumber-js` (never assumes +91), real
  `supabase.auth.signInWithOtp` / `verifyOtp` calls with actual error handling for rate limits,
  expired codes, wrong codes, network failures, and duplicate accounts (existing profile →
  redirected instead of re-created).
- **Login**: separate OTP login flow; if a verified phone has no profile yet (abandoned
  mid-signup), it resumes signup instead of creating a broken account.
- **Homepage & search**: pulls `platform_name`/hero copy/categories/countries from the DB
  (`platform_settings`, `categories`, `countries` tables) instead of hard-coded strings/arrays.
  `/search` calls the real RPC and shows honest empty/error states — no fabricated results.
- **Privacy**: `phone_e164` and exact `address` are never selected by the public views
  (`public_profile_cards`, `public_masjid_cards`, `public_madrasa_cards`); only fuzzed
  `geo_point` is used for distance search.
- **Admin**: `middleware.ts` blocks `/admin/*` server-side for non-admins (not just a hidden
  button), reinforced by `is_admin()`/`admin_covers_country()` RLS underneath. One admin screen
  is fully functional end-to-end: the verification queue (approve/reject → updates the entity,
  writes `admin_audit_logs`).
- **Notifications**: a provider-agnostic interface that **throws a real error** if no SMS/
  WhatsApp/email provider is registered, rather than pretending a message was sent.
- **PWA**: manifest + `next-pwa` wired in `next.config.mjs`.
- **Subscription expiry**: a real Edge Function (`supabase/functions/expire-subscriptions`)
  calling the real `fn_expire_subscriptions()` Postgres function, secret-protected for cron use.

## 3. What is schema/RLS-ready but has no screen yet

These have working tables, constraints, indexes, and in most cases RLS + RPCs already, but no
UI was built in this pass: admin dashboard/analytics, admin user/masjid/madrasa/event
management, admin country/state/city management, subscription plan browsing + purchase
enquiry UI, donations UI, referral dashboard, chat UI (schema supports text/voice/file/video,
groups, receipts, presence — only text 1:1 is architected, none has a screen), real-time
presence UI, translations/i18n runtime string resolution, reports/blocks UI, recitation
upload/playback UI, shop (intentionally still `shop_enabled = false`).

Building any one of these into a fully working screen is a reasonable next request.

## 4. Security review performed on this pass

- Verified `SUPABASE_SERVICE_ROLE_KEY` is only referenced in `lib/supabase/admin.ts`, guarded
  by the `server-only` package, and never prefixed `NEXT_PUBLIC_`.
- Verified every table enabled RLS has explicit policies (no table relies on "forgot to add a
  policy = accidentally public" — Postgres RLS default-denies once enabled).
- Verified phone number and exact address are structurally excluded from every public view's
  column list, not filtered client-side.
- Verified connection/message policies check participancy server-side (`conversation_participants`,
  `connections.requester_id/recipient_id`), not just hidden client UI.
- Verified `fn_request_connection` uses `unique(least(a,b), greatest(a,b))`-style dedup (see
  migration 0011) so A→B and B→A can't create duplicate rows.
- Verified admin write policies on `verification_requests`/etc. gate on `is_admin()`, and
  `admin_role = 'country_admin'` requires a non-null `managed_country_id` (DB `check` constraint).

Not yet audited (needs a real Supabase project to test against): actual RLS behavior end-to-end
against live Postgres, Storage bucket path-traversal edge cases, rate limiting at the Next.js
route level (Supabase Auth's own OTP rate limiting is relied on for now).

## 5. Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
```

Create a Supabase project, then either link and push:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push          # applies supabase/migrations/*.sql in order
```

or run the SQL files in `supabase/migrations/` in numeric order via the Supabase SQL editor.

Then seed reference data (safe for dev **and** production — it's real ISO country data, not
demo data):

```bash
psql "$DATABASE_URL" -f supabase/seed/001_countries.sql
psql "$DATABASE_URL" -f supabase/seed/002_states_starter.sql
psql "$DATABASE_URL" -f supabase/seed/003_cities_starter.sql
```

`002`/`003` are **starter** sets (major states/cities for the highest-priority launch
countries) — expand them per-country as needed; the schema has no ceiling.

Dev-only, clearly marked `[DEMO]` data (subscription plan examples, referral reward rules —
**no** fake masjids/scholars, per spec §35):

```bash
psql "$DATABASE_URL" -f supabase/seed/004_dev_seed.sql
```

Generate real TypeScript types once your project is linked (replaces the honest placeholder in
`lib/types/database.types.ts`):

```bash
npm run db:types
```

Run the app:

```bash
npm run dev
```

## 6. Required environment variables

| Variable | Where used | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` only | admin-only server operations |
| `CRON_SECRET` | Edge Function | protecting the subscription-expiry cron endpoint |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` / `NEXT_PUBLIC_SUPPORT_EMAIL` | fallback contact links | "Contact to Purchase" flow (not yet built) |

## 7. External configuration this cannot work without

- **SMS/OTP provider**: Supabase Auth phone sign-in requires a provider (Twilio, MessageBird,
  Vonage) configured under **Authentication → Providers → Phone** in the Supabase dashboard.
  Without it, `signInWithOtp` fails with a real, surfaced error — it will never pretend to
  succeed.
- **Storage buckets**: created by migration `0014_storage.sql`, but actual file upload UI
  (profile pictures, recitations, verification documents) isn't built yet.
- **Cron scheduling**: deploy the Edge Function and schedule it (Supabase dashboard → Edge
  Functions → Cron, or `supabase functions schedule`), hourly is a reasonable interval.
- **Payment gateway**: none integrated. Subscriptions are architected for the manual
  WhatsApp/email "Contact to Purchase" → admin-activation workflow described in
  `architecture.md` §5; a real gateway (Razorpay/Stripe/PayPal) would replace only the
  "Contact to Purchase" button's action and add a webhook calling the existing
  `fn_activate_subscription()`.

## 8. Deployment (Vercel + Supabase)

1. In Vercel Project Settings → General, set **Root Directory** to `MasjidFinder`.
  The Next.js app lives in that folder; deploying the repository root produces a Vercel
  404 because it contains no `app/` directory.
2. Set Framework Preset to **Next.js**, leave Output Directory blank/default, and use the
  normal `npm install` and `npm run build` commands.
3. Push this repo to GitHub/GitLab.
4. In Supabase: create a project, run migrations (`supabase db push` from CI or locally),
   run the country/state/city seed files, configure the phone OTP provider.
5. In Vercel: import the repo, set the environment variables from §6 for Production,
  Preview, and Development (mark
   `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` as **server-only/secret**, never expose them
   to the client environment group).
6. Deploy the Edge Function separately: `supabase functions deploy expire-subscriptions`, then
   schedule it.
7. First deploy: `next-pwa` only registers the service worker in production builds
   (`disable: process.env.NODE_ENV === "development"` in `next.config.mjs`), so PWA
   installability only shows up on the deployed Vercel build, not `next dev`.

## 9. Testing performed

Static/structural checks only in this environment (no live Supabase project or `npm install`
was available here): every migration file was read end-to-end for consistency (enum values,
FK targets, RLS policy coverage), parenthesis/dollar-quote balance was scanned across all SQL
files, and the signup/login/search/admin-verification code paths were manually traced for
unhandled error branches. **Not yet run**: `npm install && npm run build`, `npm run typecheck`,
or any migration against a live Postgres instance — do this before deploying, since a live run
is the only way to catch a real SQL typo or an RLS policy that doesn't behave as intended.

## 10. Honest summary of remaining work

This is a real Phase-1 core (auth, global location system, matching engine, one working admin
screen, privacy-by-construction), not a UI prototype — but it is not the full 37-section
platform. The single highest-leverage next steps, in order, are: (1) run this against a real
Supabase project and fix whatever the live DB surfaces, (2) build the admin dashboard + a
second or third admin screen (users, masjids/madrasas), (3) build the subscription
purchase-enquiry UI since the backend RPC (`fn_activate_subscription`) already exists, (4) build
1:1 chat UI against the existing `conversations`/`messages` schema and Realtime.
