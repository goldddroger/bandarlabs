"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

const changeEvent = "bandarlab-notification-read-change";
const storagePrefix = "bandarlab.notification-read.v1:";
let ownerId: string | null = null;
let readIds = new Set<string>();
let ready = false;
let snapshot = JSON.stringify({ ready: false, ids: [] as string[] });
const serverSnapshot = snapshot;
let loading: Promise<void> | null = null;

function readLocal(key: string): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

function publish() {
  snapshot = JSON.stringify({ ready, ids: [...readIds] });
  if (ownerId) {
    try { window.localStorage.setItem(`${storagePrefix}${ownerId}`, JSON.stringify([...readIds])); } catch { /* Database persistence is still available without browser storage. */ }
  }
  window.dispatchEvent(new Event(changeEvent));
}

function loadReadState() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const response = await fetch("/api/notifications?read=1", { cache: "no-store" });
      const data = await response.json() as { ownerId?: string; readIds?: string[] };
      if (!data.ownerId) return;
      const sameOwner = ownerId === data.ownerId;
      ownerId = data.ownerId;
      const cloudIds = response.ok && Array.isArray(data.readIds) ? data.readIds : [];
      readIds = new Set([...(sameOwner ? readIds : []), ...readLocal(`${storagePrefix}${ownerId}`), ...cloudIds]);
      // Re-send local acknowledgements after reconnecting; inserts are additive and idempotent.
      if (response.ok) {
        const cloudSet = new Set(cloudIds);
        const pending = [...readIds].filter((id) => !cloudSet.has(id));
        if (pending.length) await persistReadIds(pending);
      }
    } catch {
      // Keep acknowledged items locally when the connection is unavailable.
    } finally {
      ready = true;
      publish();
      loading = null;
    }
  })();
  return loading;
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  const onStorage = (event: StorageEvent) => {
    if (!ownerId || event.key !== `${storagePrefix}${ownerId}`) return;
    readIds = new Set([...readIds, ...readLocal(event.key)]);
    snapshot = JSON.stringify({ ready, ids: [...readIds] });
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useNotificationReadState() {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  useEffect(() => {
    void loadReadState();
    const refresh = () => { if (document.visibilityState === "visible") void loadReadState(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);
  return useMemo(() => {
    const state = JSON.parse(value) as { ready: boolean; ids: string[] };
    const ids = new Set(state.ids);
    return { ready: state.ready, isRead: (id: string) => ids.has(id) };
  }, [value]);
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  if (!ready) await loadReadState();
  ids.forEach((id) => readIds.add(id));
  publish();
  await persistReadIds(ids);
}

async function persistReadIds(ids: string[]) {
  for (let index = 0; index < ids.length; index += 500) {
    const response = await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readIds: ids.slice(index, index + 500) }),
    });
    if (!response.ok) throw new Error("Status dibaca tersimpan di perangkat ini, tetapi belum tersinkron. Periksa koneksi dan migration notifikasi.");
  }
}
