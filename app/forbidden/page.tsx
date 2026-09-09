import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { cookies } from "next/headers";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { homePathForSession } from "@/lib/feature-permissions";

export default async function ForbiddenPage() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(adminSessionCookie)?.value, process.env.AUTH_SESSION_SECRET);
  const homePath = session ? homePathForSession(session) : "/login";
  return <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
    <span className="flex size-12 items-center justify-center rounded-md bg-red-50 text-red-700"><LockKeyhole className="size-6" /></span>
    <h1 className="mt-5 text-2xl font-semibold text-gray-950">Fitur belum diizinkan</h1>
    <p className="mt-2 text-sm leading-6 text-gray-600">Akun ini belum memperoleh akses ke halaman tersebut. Hubungi admin BandarLab bila fitur ini diperlukan.</p>
    <Link href={homePath} className="mt-5 inline-flex h-10 items-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">Kembali ke halaman awal</Link>
  </div>;
}
