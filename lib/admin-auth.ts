import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { featurePermissions, normalizePermissions, type AppSession, type FeaturePermission } from "@/lib/feature-permissions";

export const adminSessionCookie = "bandarlab_admin_session";
export const adminSessionMaxAge = 60 * 60 * 24 * 7;

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function sessionSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession(user: { userId?: string | null; username: string; displayName?: string; role?: "admin" | "member"; permissions?: FeaturePermission[] }, secret: string) {
  const payload: AppSession = {
    userId: user.userId ?? null,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role ?? "admin",
    permissions: user.role === "member" ? normalizePermissions(user.permissions) : featurePermissions.map((permission) => permission.id),
    expiresAt: Date.now() + adminSessionMaxAge * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sessionSignature(encoded, secret)}`;
}

export function verifyAdminSession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(signature, sessionSignature(encoded, secret))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<AppSession>;
    const payload: AppSession = {
      userId: parsed.userId ?? null,
      username: String(parsed.username ?? ""),
      displayName: String(parsed.displayName ?? parsed.username ?? ""),
      role: parsed.role === "member" ? "member" : "admin",
      permissions: parsed.role === "member" ? normalizePermissions(parsed.permissions) : featurePermissions.map((permission) => permission.id),
      expiresAt: Number(parsed.expiresAt),
    };
    if (!payload.username || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !passwordHash || !safeEqual(username, expectedUsername)) return false;
  return verifyPasswordHash(password, passwordHash);
}

export function verifyPasswordHash(password: string, passwordHash: string) {
  const [algorithm, iterationsValue, salt, expected] = passwordHash.split(":");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !salt || !expected) return false;
  const actual = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return safeEqual(actual, expected);
}

export function hashPassword(password: string) {
  const iterations = 210_000;
  const encodedSalt = randomBytes(18).toString("base64url");
  const hash = pbkdf2Sync(password, encodedSalt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2-sha256:${iterations}:${encodedSalt}:${hash}`;
}
