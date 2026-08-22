import "server-only";

import { createHmac, pbkdf2Sync, timingSafeEqual } from "node:crypto";

export const adminSessionCookie = "bandarlab_admin_session";
export const adminSessionMaxAge = 60 * 60 * 24 * 7;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function sessionSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession(username: string, secret: string) {
  const payload: SessionPayload = {
    username,
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
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
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
  const [algorithm, iterationsValue, salt, expected] = passwordHash.split(":");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !salt || !expected) return false;
  const actual = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return safeEqual(actual, expected);
}
