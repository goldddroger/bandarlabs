"use client";

import { FormEvent, useState } from "react";
import { BarChart3, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Login gagal diproses.");
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(340px,0.8fr)_minmax(520px,1.2fr)]">
      <section className="hidden border-r border-gray-200 bg-gray-50 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-red-600 text-white"><BarChart3 className="size-7" strokeWidth={2.4} /></span>
          <div><p className="text-2xl font-bold leading-6 text-gray-950">Bandar<span className="text-red-600">Lab</span></p><p className="mt-1 text-xs text-gray-500">Indonesian Stock Intelligence</p></div>
        </div>
        <div className="max-w-md">
          <div className="border-l-4 border-red-600 pl-6">
            <p className="text-3xl font-semibold leading-10 text-gray-950">Catatan, data, dan keputusan investasi dalam satu workspace pribadi.</p>
            <p className="mt-4 text-sm leading-6 text-gray-600">Akses dibatasi untuk administrator BandarLab.</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">BandarLab bukan rekomendasi jual atau beli saham.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-lg bg-red-600 text-white"><BarChart3 className="size-6" /></span>
            <p className="text-2xl font-bold text-gray-950">Bandar<span className="text-red-600">Lab</span></p>
          </div>
          <span className="mt-12 flex size-10 items-center justify-center rounded-md bg-red-50 text-red-700 lg:mt-0"><LockKeyhole className="size-5" /></span>
          <h1 className="mt-5 text-2xl font-semibold text-gray-950">Masuk ke BandarLab</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">Gunakan akun administrator untuk melanjutkan.</p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div><label htmlFor="admin-username" className="block text-sm font-semibold text-gray-800">Username</label><input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-sm font-normal focus:border-red-500 focus:ring-2 focus:ring-red-100" /></div>
            <div><label htmlFor="admin-password" className="block text-sm font-semibold text-gray-800">Password</label><span className="relative mt-2 block"><input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="h-11 w-full rounded-md border border-gray-300 px-3 pr-11 text-sm font-normal focus:border-red-500 focus:ring-2 focus:ring-red-100" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></div>
            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={!username.trim() || !password || loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{loading ? "Memeriksa..." : "Masuk"}</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
