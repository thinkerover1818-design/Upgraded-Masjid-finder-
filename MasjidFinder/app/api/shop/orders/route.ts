import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in before placing an order." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.items) || !body.items.length || !body.name || !body.contact || !body.address) return NextResponse.json({ error: "Add products and complete delivery details." }, { status: 400 });
  const { data, error } = await supabase.rpc("fn_create_shop_order", { p_items: body.items, p_shipping_name: String(body.name), p_shipping_contact: String(body.contact), p_shipping_address: String(body.address) });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orderId: data });
}