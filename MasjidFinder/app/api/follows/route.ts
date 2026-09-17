import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const followingId = typeof body?.followingId === "string" ? body.followingId : "";
  if (!followingId || followingId === user.id) return NextResponse.json({ error: "Choose another profile." }, { status: 400 });
  const table = supabase.from("profile_follows");
  if (body?.action === "unfollow") {
    const { error } = await table.delete().eq("follower_id", user.id).eq("following_id", followingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await table.insert({ follower_id: user.id, following_id: followingId });
    if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}