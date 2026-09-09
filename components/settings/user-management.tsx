"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, Pencil, Plus, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { featurePermissions, type FeaturePermission } from "@/lib/feature-permissions";
import { cn } from "@/lib/utils";

type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "member";
  permissions: FeaturePermission[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  displayName: string;
  username: string;
  password: string;
  permissions: FeaturePermission[];
  isActive: boolean;
};

const emptyForm: FormState = { displayName: "", username: "", password: "", permissions: [], isActive: true };

function formatDate(value: string | null) {
  if (!value) return "Belum pernah masuk";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const payload = await response.json() as { users?: ManagedUser[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Pengguna gagal dimuat.");
      setUsers(payload.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pengguna gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({ displayName: user.displayName, username: user.username, password: "", permissions: user.permissions, isActive: user.isActive });
    setShowPassword(false);
    setModalOpen(true);
  }

  function togglePermission(permission: FeaturePermission) {
    setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, ...form }),
      });
      const payload = await response.json() as { user?: ManagedUser; error?: string };
      if (!response.ok || !payload.user) throw new Error(payload.error || "Pengguna gagal disimpan.");
      setUsers((current) => editing ? current.map((user) => user.id === payload.user?.id ? payload.user : user) : [...current, payload.user!]);
      setModalOpen(false);
      toast.success(editing ? "Akses pengguna berhasil diperbarui." : "Pengguna baru berhasil dibuat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pengguna gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);
  const formReady = form.displayName.trim().length >= 2 && (editing || /^[a-zA-Z0-9._-]{3,40}$/.test(form.username.trim())) && (editing ? !form.password || form.password.length >= 8 : form.password.length >= 8);

  return <section className="mt-6 border-t border-gray-200 pt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><Users className="size-5 text-red-600" /><h2 className="text-lg font-semibold text-gray-950">Pengguna & Akses Fitur</h2></div><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Buat akun untuk teman dan tentukan halaman yang dapat mereka gunakan. Data workspace tetap dibagikan, tetapi fitur tanpa izin diblokir pada halaman dan API.</p></div>
      <Button onClick={openCreate}><Plus className="size-4" />Tambah pengguna</Button>
    </div>

    <div className="mt-5 grid overflow-hidden rounded-md border border-gray-200 sm:grid-cols-3">
      <Summary label="Admin utama" value="1" icon={ShieldCheck} />
      <Summary label="Pengguna tambahan" value={String(users.length)} icon={Users} />
      <Summary label="Akun aktif" value={String(activeCount)} icon={UserRound} />
    </div>

    <div className="mt-5 overflow-hidden rounded-md border border-gray-200">
      <div className="hidden grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.5fr)_130px_48px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 md:grid"><span>Pengguna</span><span>Akses fitur</span><span>Login terakhir</span><span /></div>
      {loading ? <div className="flex min-h-32 items-center justify-center text-gray-500"><Loader2 className="mr-2 size-5 animate-spin" />Memuat pengguna...</div> : users.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center"><Users className="size-7 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-800">Belum ada pengguna tambahan</p><p className="mt-1 text-xs text-gray-500">Admin utama tetap berasal dari environment Vercel.</p></div> : <div className="divide-y divide-gray-100">{users.map((user) => <div key={user.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.5fr)_130px_48px] md:items-center md:gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-sm text-gray-950">{user.displayName}</strong><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>{user.isActive ? "Aktif" : "Nonaktif"}</span></div><p className="mt-1 truncate text-xs text-gray-500">@{user.username}</p></div><div className="flex flex-wrap gap-1.5">{user.permissions.length ? user.permissions.slice(0, 4).map((permission) => <span key={permission} className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">{featurePermissions.find((item) => item.id === permission)?.label ?? permission}</span>) : <span className="text-xs text-red-600">Tidak ada fitur</span>}{user.permissions.length > 4 ? <span className="rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">+{user.permissions.length - 4}</span> : null}</div><p className="text-xs leading-5 text-gray-500"><span className="md:hidden">Login terakhir: </span>{formatDate(user.lastLoginAt)}</p><button type="button" onClick={() => openEdit(user)} title="Edit pengguna" className="inline-flex size-9 items-center justify-center justify-self-end rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-700"><Pencil className="size-4" /></button></div>)}</div>}
    </div>

    <p className="mt-3 text-xs leading-5 text-gray-500">Perubahan akses berlaku ketika pengguna login kembali. Nonaktifkan akun untuk menolak login berikutnya.</p>

    {modalOpen ? <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-lg"><header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4"><div><h3 id="user-form-title" className="text-lg font-semibold text-gray-950">{editing ? "Edit akses pengguna" : "Tambah pengguna"}</h3><p className="mt-1 text-sm text-gray-500">{editing ? `Atur ulang akses untuk @${editing.username}.` : "Buat kredensial dan pilih fitur yang boleh digunakan."}</p></div><button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Tutup" className="inline-flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X className="size-5" /></button></header>
      <div className="overflow-y-auto px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama tampilan" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} placeholder="Contoh: Fawwaz" /><Field label="Username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value.toLowerCase() }))} placeholder="contoh: fawwaz" disabled={Boolean(editing)} /></div>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold text-gray-700"><span>{editing ? "Password baru (opsional)" : "Password"}</span><span className="relative flex h-11 items-center rounded-md border border-gray-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"><KeyRound className="ml-3 size-4 text-gray-400" /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editing ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"} className="min-w-0 flex-1 px-3 text-sm font-normal outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="mr-1 inline-flex size-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-semibold text-gray-950">Izin fitur</h4><p className="mt-1 text-xs text-gray-500">Pilih semua fitur yang boleh dibuka akun ini.</p></div><div className="flex gap-2"><button type="button" onClick={() => setForm((current) => ({ ...current, permissions: featurePermissions.map((item) => item.id) }))} className="text-xs font-semibold text-red-700">Pilih semua</button><span className="text-gray-300">|</span><button type="button" onClick={() => setForm((current) => ({ ...current, permissions: [] }))} className="text-xs font-semibold text-gray-600">Kosongkan</button></div></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{featurePermissions.map((permission) => { const checked = form.permissions.includes(permission.id); return <button key={permission.id} type="button" role="checkbox" aria-checked={checked} onClick={() => togglePermission(permission.id)} className={cn("flex min-h-20 items-start gap-3 rounded-md border p-3 text-left transition", checked ? "border-red-200 bg-red-50/60" : "border-gray-200 hover:bg-gray-50")}><span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border", checked ? "border-red-600 bg-red-600 text-white" : "border-gray-300 bg-white")}>{checked ? <Check className="size-3.5" /> : null}</span><span><strong className="block text-sm text-gray-900">{permission.label}</strong><span className="mt-1 block text-xs leading-5 text-gray-500">{permission.description}</span></span></button>; })}</div>
        {editing ? <label className="mt-5 flex items-center justify-between gap-4 rounded-md border border-gray-200 px-4 py-3"><span><strong className="block text-sm text-gray-900">Akun aktif</strong><span className="mt-1 block text-xs text-gray-500">Akun nonaktif tidak dapat membuat sesi login baru.</span></span><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="size-5 accent-red-600" /></label> : null}
      </div>
      <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4"><Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button><Button onClick={save} disabled={!formReady || saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{editing ? "Simpan perubahan" : "Buat pengguna"}</Button></footer>
    </section></div> : null}
  </section>;
}

function Summary({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) { return <div className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="flex size-9 items-center justify-center rounded-md bg-gray-100 text-gray-600"><Icon className="size-4" /></span><div><p className="text-xs text-gray-500">{label}</p><p className="mt-0.5 text-lg font-semibold text-gray-950">{value}</p></div></div>; }
function Field({ label, value, onChange, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) { return <label className="grid gap-1.5 text-sm font-semibold text-gray-700"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="h-11 rounded-md border border-gray-200 px-3 text-sm font-normal outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-500" /></label>; }
