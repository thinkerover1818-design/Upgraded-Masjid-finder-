import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPPORTED_TYPES = new Set([
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "reauthentication",
  "sms",
]);

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || !type || !SUPPORTED_TYPES.has(type)) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("This confirmation link is invalid or incomplete.")}`);
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: "", ...options }); },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
  if (error) {
    const message = error.message.toLowerCase().includes("expired")
      ? "This confirmation link has expired. Request a new email and try again."
      : error.message;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Confirmation succeeded but no session was created.")}`);

  let destination = "/dashboard";
  if (type === "recovery") {
    destination = "/reset-password";
  } else {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) destination = "/signup?resume=1";
  }

  const redirect = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}