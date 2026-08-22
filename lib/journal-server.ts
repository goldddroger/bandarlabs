import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function journalServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessKey = process.env.JOURNAL_ACCESS_KEY;
  if (!url || !serviceKey || !accessKey) return null;
  return {
    accessKey,
    supabase: createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}

export function journalKeyMatches(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function journalAccessKey(request: Request) {
  return request.headers.get("x-journal-access-key") ?? "";
}
