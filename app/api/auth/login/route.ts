import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminSessionCookie, adminSessionMaxAge, createAdminSession, verifyAdminCredentials, verifyPasswordHash } from "@/lib/admin-auth";
import { homePathForSession, normalizePermissions, type AppSession } from "@/lib/feature-permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminConfigured = Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH);
  const databaseConfigured = Boolean(supabaseUrl && serviceRoleKey);
  if (!sessionSecret || (!adminConfigured && !databaseConfigured)) {
    return NextResponse.json({ error: "Login BandarLab belum dikonfigurasi pada server." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = String(body?.username ?? "").trim().slice(0, 80);
  const password = String(body?.password ?? "").slice(0, 200);
  let authenticated: Omit<AppSession, "expiresAt"> | null = null;
  if (adminConfigured && username && password && verifyAdminCredentials(username, password)) {
    authenticated = { userId: null, username, displayName: "Admin", role: "admin", permissions: [] };
  } else if (username && password && databaseConfigured && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: user } = await supabase.from("app_users").select("id,username,display_name,password_hash,role,permissions,is_active").eq("username", username.toLowerCase()).maybeSingle();
    if (user?.is_active && verifyPasswordHash(password, String(user.password_hash))) {
      authenticated = { userId: String(user.id), username: String(user.username), displayName: String(user.display_name || user.username), role: user.role === "admin" ? "admin" : "member", permissions: normalizePermissions(user.permissions) };
      await supabase.from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
    }
  }
  if (!authenticated) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Username atau password tidak sesuai." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, homePath: homePathForSession(authenticated), user: { username: authenticated.username, displayName: authenticated.displayName, role: authenticated.role } });
  response.cookies.set(adminSessionCookie, createAdminSession(authenticated, sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAge,
    priority: "high",
  });
  return response;
}
