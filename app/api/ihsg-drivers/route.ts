import { getIhsgDrivers } from "@/lib/ihsg-drivers-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getIhsgDrivers(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Data penggerak IHSG belum tersedia. Coba perbarui kembali." }, { status: 502 });
  }
}
