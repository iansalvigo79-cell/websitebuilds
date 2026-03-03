import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function middleware(req: any) {
  const res = NextResponse.next();
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", session.user.id)
    .single();

  if (profile?.account_type !== "paid") {
    return NextResponse.redirect(new URL("/subscribe", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};