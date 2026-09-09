import { type NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = verifyAdminSession(request.cookies.get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);
  if (!session) return NextResponse.json({ error: "Sesi pengguna tidak valid." }, { status: 401 });
  return NextResponse.json({ session }, { headers: { "Cache-Control": "private, no-store" } });
}
