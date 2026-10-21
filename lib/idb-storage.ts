"use client";
import type { StateStorage } from "zustand/middleware";

// Stockage IndexedDB minimal : les projets (images IA, logos) dépassent vite les 5 Mo de localStorage.
const DB = "packai";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try { return ((await tx("readonly", (s) => s.get(name))) as string | undefined) ?? null; } catch { return null; }
  },
  setItem: async (name, value) => {
    try { await tx("readwrite", (s) => s.put(value, name)); } catch { /* stockage indisponible (navigation privée) */ }
  },
  removeItem: async (name) => {
    try { await tx("readwrite", (s) => s.delete(name)); } catch { /* ignoré */ }
  },
};
