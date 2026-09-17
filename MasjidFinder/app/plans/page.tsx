import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PlanEnquiryForm from "./PlanEnquiryForm";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const supabase = createClient() as any;
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("id,name,description,price,currency,duration_days,enquiry_limit,boost_duration_days,scope,benefits")
    .eq("is_active", true)
    .order("sort_order")
    .order("price");

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700">← Home</Link>
        <header className="mt-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">Visibility and growth</p>
          <h1 className="mt-2 text-3xl font-semibold text-emerald-900">Plans for people doing meaningful work</h1>
          <p className="mt-3 text-ink-600">Choose a plan, send an enquiry, and our team will confirm payment and activate the benefits on your account.</p>
        </header>
        {error ? <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Plans are temporarily unavailable: {error.message}</p> : (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {(plans ?? []).map((plan: any) => (
              <article key={plan.id} className="flex flex-col rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-emerald-900">{plan.name}</h2>
                  <p className="mt-2 text-sm text-ink-600">{plan.description || "A practical way to improve your listing visibility."}</p>
                  <p className="mt-5 text-2xl font-semibold text-ink-900">{plan.currency} {plan.price}<span className="text-sm font-normal text-ink-400"> / {plan.duration_days} days</span></p>
                  <ul className="mt-5 space-y-2 text-sm text-ink-600">
                    <li>• {plan.scope === "global" ? "Global" : "Country"} visibility</li>
                    {plan.enquiry_limit ? <li>• {plan.enquiry_limit} connection enquiries</li> : null}
                    {plan.boost_duration_days ? <li>• Boosted placement for {plan.boost_duration_days} days</li> : null}
                    {plan.benefits?.verified_badge ? <li>• Verified badge benefit</li> : null}
                    {plan.benefits?.featured ? <li>• Featured listing placement</li> : null}
                  </ul>
                </div>
                <PlanEnquiryForm planId={plan.id} whatsappMessage={plan.benefits?.whatsapp_message || `I want to enquire about the ${plan.name} plan.`} />
              </article>
            ))}
          </section>
        )}
        {!error && !(plans ?? []).length && <p className="mt-8 rounded-lg border border-black/10 bg-white p-5 text-sm text-ink-600">No plans are active yet. Please check back soon.</p>}
      </div>
    </main>
  );
}