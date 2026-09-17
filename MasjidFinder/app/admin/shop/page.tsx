import { revalidatePath } from "next/cache";
import { AdminHeader, EmptyState, ErrorState } from "../ui";
import { adminDb, requireAdmin } from "../admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function createCategory(formData: FormData) {
  "use server";
  const db = adminDb();
  await db.from("shop_categories").insert({ name: String(formData.get("name")), slug: String(formData.get("slug")), description: String(formData.get("description") || "") || null });
  revalidatePath("/admin/shop");
}

async function createProduct(formData: FormData) {
  "use server";
  const db = adminDb();
  const { data: seller } = await db.from("shop_sellers").select("id").eq("is_approved", true).limit(1).maybeSingle();
  if (!seller) return;
  let images: string[] = [];
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) return;
    const storage = createAdminClient();
    const path = `products/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const upload = await storage.storage.from("institution-logos").upload(path, image, { contentType: image.type, upsert: false });
    if (upload.error) return;
    images = [storage.storage.from("institution-logos").getPublicUrl(path).data.publicUrl];
  }
  await db.from("shop_products").insert({ seller_id: seller.id, name: String(formData.get("name")), description: String(formData.get("description") || "") || null, images, price: Number(formData.get("price") || 0), currency: String(formData.get("currency") || "USD").toUpperCase(), stock: Number(formData.get("stock") || 0), category: String(formData.get("category") || "") || null, is_global: true });
  revalidatePath("/admin/shop");
}

async function toggleProduct(formData: FormData) {
  "use server";
  const db = adminDb();
  await db.from("shop_products").update({ is_active: String(formData.get("active")) !== "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/shop");
}

export default async function AdminShopPage() {
  const context = await requireAdmin();
  if (!context) return <main className="p-8 text-sm text-red-700">Your account is not an admin.</main>;
  const [{ data: categories }, { data: products, error }] = await Promise.all([
    context.supabase.from("shop_categories").select("id,name,slug,is_active").order("sort_order"),
    context.supabase.from("shop_products").select("id,name,price,currency,stock,category,is_active").order("created_at", { ascending: false }),
  ]);
  return <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><AdminHeader title="Shop" description="Manage the public catalog and inventory." /><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-lg border border-black/8 bg-white p-5"><h2 className="font-bold text-emerald-900">Add category</h2><form action={createCategory} className="mt-4 grid gap-2"><input required name="name" placeholder="Category name" className="rounded border px-3 py-2 text-sm" /><input required name="slug" placeholder="category-slug" className="rounded border px-3 py-2 text-sm" /><input name="description" placeholder="Description" className="rounded border px-3 py-2 text-sm" /><button className="rounded bg-emerald-900 px-3 py-2 text-sm font-semibold text-white">Create category</button></form><ul className="mt-5 divide-y text-sm">{(categories ?? []).map((category: any) => <li key={category.id} className="flex justify-between py-2"><span>{category.name}</span><span className="text-xs text-ink-400">{category.slug}</span></li>)}</ul></section><section className="rounded-lg border border-black/8 bg-white p-5"><h2 className="font-bold text-emerald-900">Add product</h2><form action={createProduct} encType="multipart/form-data" className="mt-4 grid gap-2 sm:grid-cols-2"><input required name="name" placeholder="Product name" className="rounded border px-3 py-2 text-sm" /><input name="category" placeholder="Category slug" className="rounded border px-3 py-2 text-sm" /><input required name="price" type="number" min="0" step="0.01" placeholder="Price" className="rounded border px-3 py-2 text-sm" /><input required name="currency" defaultValue="USD" maxLength={3} className="rounded border px-3 py-2 text-sm uppercase" /><input required name="stock" type="number" min="0" placeholder="Stock" className="rounded border px-3 py-2 text-sm" /><input required accept="image/*" capture="environment" name="image" type="file" className="rounded border px-3 py-2 text-sm" /><input name="description" placeholder="Description" className="rounded border px-3 py-2 text-sm sm:col-span-2" /><button className="rounded bg-emerald-900 px-3 py-2 text-sm font-semibold text-white sm:col-span-2">Upload product</button></form></section></div>{error ? <ErrorState message={error.message} /> : !products?.length ? <EmptyState title="No products" description="Add a product to publish it in the shop." /> : <div className="mt-6 overflow-x-auto rounded-lg border border-black/8 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-sand-50 text-xs"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{products.map((product: any) => <tr key={product.id}><td className="px-4 py-3 font-semibold text-emerald-900">{product.name}</td><td className="px-4 py-3">{product.currency} {product.price}</td><td className="px-4 py-3">{product.stock}</td><td className="px-4 py-3">{product.is_active ? "Active" : "Hidden"}</td><td className="px-4 py-3"><form action={toggleProduct}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="active" value={String(product.is_active)} /><button className="text-xs font-semibold text-emerald-700">{product.is_active ? "Hide" : "Publish"}</button></form></td></tr>)}</tbody></table></div>}</main>;
}