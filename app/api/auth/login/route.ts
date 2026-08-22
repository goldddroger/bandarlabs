import { NextResponse } from "next/server";
import { adminSessionCookie, adminSessionMaxAge, createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || !sessionSecret) {
    return NextResponse.json({ error: "Login admin belum dikonfigurasi pada server." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = String(body?.username ?? "").trim().slice(0, 80);
  const password = String(body?.password ?? "").slice(0, 200);
  if (!username || !password || !verifyAdminCredentials(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Username atau password tidak sesuai." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookie, createAdminSession(username, sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAge,
    priority: "high",
  });
  return response;
}
