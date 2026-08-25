import { axentrazJsonResponse } from "@/lib/axentraz";

export const dynamic = "force-dynamic";

export async function GET() {
  return axentrazJsonResponse("/brokers");
}
