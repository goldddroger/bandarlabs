import "server-only";

import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import type { AppSession } from "@/lib/feature-permissions";

export const legacyAdminOwnerId = "00000000-0000-4000-8000-000000000001";

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return item.slice(separator + 1).trim();
    }
  }
  return undefined;
}

export function getRequestSession(request: Request): AppSession | null {
  return verifyAdminSession(
    readCookie(request, adminSessionCookie),
    process.env.AUTH_SESSION_SECRET,
  );
}

export function getRequestOwnerId(request: Request) {
  const session = getRequestSession(request);
  if (!session) return null;
  return session.userId ?? legacyAdminOwnerId;
}

export function unauthorizedResponseBody() {
  return { error: "Sesi pengguna tidak valid." };
}
