import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, hashPassword, verifyAdminSession } from "@/lib/admin-auth";
import { normalizePermissions } from "@/lib/feature-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function adminSession(request: NextRequest) {
  const session = verifyAdminSession(request.cookies.get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);
  return session?.role === "admin" ? session : null;
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    permissions: normalizePermissions(row.permissions),
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  if (!adminSession(request)) return NextResponse.json({ error: "Hanya admin yang dapat mengelola pengguna." }, { status: 403 });
  const supabase = database();
  if (!supabase) return NextResponse.json({ error: "Supabase user management belum dikonfigurasi." }, { status: 503 });
  const { data, error } = await supabase.from("app_users").select("id,username,display_name,role,permissions,is_active,last_login_at,created_at,updated_at").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Daftar pengguna gagal dimuat. Jalankan migration user management." }, { status: 500 });
  return NextResponse.json({ users: (data ?? []).map((row) => mapUser(row)) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!adminSession(request)) return NextResponse.json({ error: "Hanya admin yang dapat menambah pengguna." }, { status: 403 });
  const supabase = database();
  if (!supabase) return NextResponse.json({ error: "Supabase user management belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const username = clean(body?.username, 40).toLowerCase();
  const displayName = clean(body?.displayName, 80);
  const password = String(body?.password ?? "");
  const permissions = normalizePermissions(body?.permissions);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return NextResponse.json({ error: "Username minimal 3 karakter dan hanya boleh memakai huruf kecil, angka, titik, strip, atau underscore." }, { status: 400 });
  if (displayName.length < 2) return NextResponse.json({ error: "Nama pengguna minimal 2 karakter." }, { status: 400 });
  if (password.length < 8 || password.length > 200) return NextResponse.json({ error: "Password harus terdiri dari 8 sampai 200 karakter." }, { status: 400 });
  if (username === process.env.ADMIN_USERNAME?.toLowerCase()) return NextResponse.json({ error: "Username tersebut digunakan oleh admin utama." }, { status: 409 });
  const { data, error } = await supabase.from("app_users").insert({ username, display_name: displayName, password_hash: hashPassword(password), role: "member", permissions, is_active: true }).select("id,username,display_name,role,permissions,is_active,last_login_at,created_at,updated_at").single();
  if (error?.code === "23505") return NextResponse.json({ error: "Username sudah digunakan." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "Pengguna gagal dibuat." }, { status: 500 });
  return NextResponse.json({ user: mapUser(data) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!adminSession(request)) return NextResponse.json({ error: "Hanya admin yang dapat mengubah pengguna." }, { status: 403 });
  const supabase = database();
  if (!supabase) return NextResponse.json({ error: "Supabase user management belum dikonfigurasi." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const displayName = clean(body?.displayName, 80);
  const password = String(body?.password ?? "");
  const permissions = normalizePermissions(body?.permissions);
  const isActive = body?.isActive !== false;
  if (!/^[0-9a-f-]{36}$/i.test(id) || displayName.length < 2) return NextResponse.json({ error: "Data pengguna belum valid." }, { status: 400 });
  if (password && (password.length < 8 || password.length > 200)) return NextResponse.json({ error: "Password baru harus terdiri dari 8 sampai 200 karakter." }, { status: 400 });
  const update: Record<string, unknown> = { display_name: displayName, permissions, is_active: isActive };
  if (password) update.password_hash = hashPassword(password);
  const { data, error } = await supabase.from("app_users").update(update).eq("id", id).eq("role", "member").select("id,username,display_name,role,permissions,is_active,last_login_at,created_at,updated_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Pengguna tidak ditemukan atau gagal diubah." }, { status: 500 });
  return NextResponse.json({ user: mapUser(data) });
}
