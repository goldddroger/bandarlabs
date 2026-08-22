import { type NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicRoute = pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/logout";
  const session = verifyAdminSession(request.cookies.get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);

  if (publicRoute) {
    if (pathname === "/login" && session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
