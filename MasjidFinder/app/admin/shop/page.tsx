import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader, EmptyState, ErrorState } from "../ui";
import { adminDb, requireAdmin } from "../admin-data";

export const dynamic = "force-dynamic";

async function saveCategory(formData: FormData) {
  "use server";
  const db = adminDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: admin } = await db.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const service = createAdminClient() as any;
  await service.from("shop_categories").upsert({ name, slug, description: String(formData.get("description") || "").trim() || null, sort_order: Number(formData.get("sort_order") || 0), is_active: true }, { onConflict: "slug" });
  revalidatePath("/admin/shop");
}

async function toggleCategory(formData: FormData) {
  "use server";
  const db = adminDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: admin } = await db.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return;
  const service = createAdminClient() as any;
  await service.from("shop_categories").update({ is_active: String(formData.get("active")) !== "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/shop");
}

async function saveProduct(formData: FormData) {
  "use server";
  const db = adminDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: admin } = await db.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle();
  if (!admin?.is_active) return;
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price"));
  if (!name || !Number.isFinite(price) || price < 0) return;
  const service = createAdminClient() as any;
  const { data: existingSeller } = await service.from("shop_sellers").select("id").eq("profile_id", user.id).maybeSingle();
  const seller = existingSeller ?? (await service.from("shop_sellers").insert({ profile_id: user.id, is_approved: true }).select("id").single()).data;
  if (!seller) return;
  const file = formData.get("image");
  let imageUrl: string | null = null;
  if (file instanceof File && file.size) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/product-${crypto.randomUUID()}.${extension}`;
    const upload = await service.storage.from("shop-product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) return;
    imageUrl = service.storage.from("shop-product-images").getPublicUrl(path).data.publicUrl;
  }
  await service.from("shop_products").insert({ seller_id: seller.id, name, description: String(formData.get("description") || "").trim() || null, images: imageUrl ? [imageUrl] : [], price, currency: String(formData.get("currency") || "USD").toUpperCase(), stock: Math.max(0, Number(formData.get("stock") || 0)), category: String(formData.get("category") || "") || null, is_global: true, is_active: true });
  revalidatePath("/admin/shop");
  revalidatePath("/shop");
}

async function deleteProduct(formData: FormData) {
  "use server";
  const db = adminDb(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  const { data: admin } = await db.from("admin_users").select("is_active").eq("profile_id", user.id).maybeSingle(); if (!admin?.is_active) return;
  await (createAdminClient() as any).from("shop_products").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/shop"); revalidatePath("/shop");
}

export default async function AdminShopPage() {
  const context = await requireAdmin();
  if (!context) return <main className="p-8 text-sm text-red-700">Your account is not an admin.</main>;
  const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
    context.supabase.from("shop_categories").select("id,name,slug,description,sort_order,is_active").order("sort_order").order("name"),
    context.supabase.from("shop_products").select("id,name,description,images,price,currency,stock,category,is_active").order("created_at", { ascending: false }),
  ]);
  return <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><AdminHeader title="Shop" description="Manage public shop categories, products, stock, and product photos." />{categoryError || productError ? <ErrorState message={(categoryError || productError)?.message ?? "Could not load shop data."} /> : <div className="grid gap-6 lg:grid-cols-[22rem_1fr]"><div className="space-y-6"><form action={saveCategory} className="rounded-lg border border-black/8 bg-white p-4"><h2 className="mb-3 font-bold text-emerald-900">Add category</h2><div className="grid gap-2"><input name="name" required placeholder="Category name" className="rounded border border-black/10 px-3 py-2 text-sm" /><input name="description" placeholder="Short description" className="rounded border border-black/10 px-3 py-2 text-sm" /><input name="sort_order" type="number" defaultValue="0" placeholder="Sort order" className="rounded border border-black/10 px-3 py-2 text-sm" /><button className="rounded bg-emerald-900 px-3 py-2 text-sm font-semibold text-white">Save category</button></div></form><section className="rounded-lg border border-black/8 bg-white p-4"><h2 className="mb-3 font-bold text-emerald-900">Categories</h2>{!categories?.length ? <EmptyState title="No shop categories" description="Add the first category above." /> : <ul className="divide-y divide-black/5">{categories.map((category: any) => <li key={category.id} className="flex items-center justify-between gap-2 py-3 text-sm"><span><span className="font-semibold text-ink-800">{category.name}</span><span className="block text-xs text-ink-400">/{category.slug}</span></span><form action={toggleCategory}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="active" value={String(category.is_active)} /><button className="text-xs font-semibold text-emerald-700">{category.is_active ? "Disable" : "Enable"}</button></form></li>)}</ul>}</section></div><div className="space-y-6"><form action={saveProduct} encType="multipart/form-data" className="rounded-lg border border-black/8 bg-white p-4"><h2 className="mb-3 font-bold text-emerald-900">Add product</h2><div className="grid gap-3 sm:grid-cols-2"><input name="name" required placeholder="Product name" className="rounded border border-black/10 px-3 py-2 text-sm" /><select name="category" className="rounded border border-black/10 px-3 py-2 text-sm"><option value="">No category</option>{(categories ?? []).filter((category: any) => category.is_active).map((category: any) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select><textarea name="description" placeholder="Description" rows={3} className="sm:col-span-2 rounded border border-black/10 px-3 py-2 text-sm" /><div className="grid grid-cols-3 gap-2"><input name="price" required type="number" min="0" step="0.01" placeholder="Price" className="rounded border border-black/10 px-3 py-2 text-sm" /><input name="currency" defaultValue="USD" maxLength={3} placeholder="USD" className="rounded border border-black/10 px-3 py-2 text-sm uppercase" /><input name="stock" required type="number" min="0" defaultValue="0" placeholder="Stock" className="rounded border border-black/10 px-3 py-2 text-sm" /></div><label className="sm:col-span-2 text-xs font-semibold text-ink-600">Product photo<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs font-normal" /></label><button className="sm:col-span-2 rounded bg-emerald-900 px-3 py-2 text-sm font-semibold text-white">Add product</button></div></form><section className="rounded-lg border border-black/8 bg-white p-4"><h2 className="mb-3 font-bold text-emerald-900">Products <span className="text-xs font-normal text-ink-400">({products?.length ?? 0})</span></h2>{!products?.length ? <EmptyState title="No products" description="Add a product above to publish it in the shop." /> : <div className="grid gap-3 sm:grid-cols-2">{products.map((product: any) => <article key={product.id} className="flex gap-3 rounded border border-black/8 p-3">{product.images?.[0] ? <img src={product.images[0]} alt="" className="h-16 w-16 rounded object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded bg-sand-100 text-xs text-ink-400">No photo</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-emerald-900">{product.name}</h3><p className="text-xs text-ink-500">{product.currency} {product.price} · {product.stock} in stock</p><p className="text-xs text-ink-400">{product.category || "Uncategorized"}</p></div></article>)}</div>}</section></div></div>}</main>;
}