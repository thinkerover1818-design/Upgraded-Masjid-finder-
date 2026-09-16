import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google sign-in was cancelled or failed.")}`);
  const response = NextResponse.next();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: "", ...options }); },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google sign-in did not create a session.")}`);
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  const redirect = NextResponse.redirect(`${origin}${profile ? "/dashboard" : "/signup?new=1"}`);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}