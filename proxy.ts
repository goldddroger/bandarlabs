import { type NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { updateSession } from "@/lib/supabase/proxy";
import { hasFeaturePermission, homePathForSession, permissionForPath } from "@/lib/feature-permissions";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authRoute = pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/logout";
  const session = verifyAdminSession(request.cookies.get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);

  if (authRoute) {
    if (pathname === "/login" && session) return NextResponse.redirect(new URL(homePathForSession(session), request.url));
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesi pengguna tidak valid." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/settings" || pathname.startsWith("/api/users")) && session.role !== "admin") {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Hanya admin yang dapat mengelola pengguna." }, { status: 403 });
    return NextResponse.redirect(new URL("/forbidden?reason=admin", request.url));
  }

  const requiredPermission = permissionForPath(pathname);
  if (requiredPermission && !hasFeaturePermission(session, requiredPermission)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Akun tidak memiliki izin untuk fitur ini." }, { status: 403 });
    const forbiddenUrl = new URL("/forbidden", request.url);
    forbiddenUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(forbiddenUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
