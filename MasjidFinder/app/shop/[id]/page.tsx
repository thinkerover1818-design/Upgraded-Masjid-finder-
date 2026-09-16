import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "../AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient() as any;
  const { data: product } = await supabase.from("shop_products").select("id,name,description,images,price,currency,stock,category").eq("id", params.id).eq("is_active", true).maybeSingle();
  if (!product) notFound();
  return <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl"><Link href="/shop" className="text-sm font-semibold text-emerald-700">← Back to shop</Link><article className="mt-8 grid gap-8 rounded-xl border border-black/10 bg-white p-5 sm:grid-cols-2 sm:p-8"><div className="flex aspect-square items-center justify-center rounded-lg bg-sand-100 text-6xl text-emerald-900">✦</div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">{product.category || "Islamic goods"}</p><h1 className="mt-2 text-3xl font-semibold text-emerald-900">{product.name}</h1><p className="mt-4 text-2xl font-semibold text-ink-900">{product.currency} {product.price}</p><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink-600">{product.description || "Product details will be provided by the approved seller."}</p><p className="mt-5 text-xs text-ink-400">{product.stock} in stock</p><div className="mt-5 flex max-w-xs"><AddToCart product={{ id: product.id, name: product.name, price: product.price, currency: product.currency }} /></div></div></article></div></main>;
}