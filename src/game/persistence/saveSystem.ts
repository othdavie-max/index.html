/**
 * Local save system. Works fully offline: IndexedDB in the browser, with an in-memory backend for tests and a
 * localStorage fallback if IndexedDB is unavailable (e.g. some private-browsing modes).
 * Slots: "auto" (automatic saves at safe points) plus manual slots 1–3. Nothing is ever sent over the network.
 */
import type { GameState } from "../engine/types";
import { SAVE_FORMAT, SaveError, deserialise, serialise, summarise, type SaveEnvelope, type SaveSummary } from "./saveFormat";
import { SIM_VERSION } from "../engine/types";

export type SlotId = "auto" | "1" | "2" | "3";
export const SLOTS: SlotId[] = ["auto", "1", "2", "3"];

export interface SlotInfo {
  slot: SlotId;
  empty: boolean;
  savedAt?: number;
  summary?: SaveSummary;
  /** set if the slot exists but cannot be loaded */
  problem?: string;
}

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryBackend implements StorageBackend {
  private m = new Map<string, string>();
  async get(k: string) { return this.m.get(k) ?? null; }
  async set(k: string, v: string) { this.m.set(k, v); }
  async remove(k: string) { this.m.delete(k); }
}

class LocalStorageBackend implements StorageBackend {
  async get(k: string) { return localStorage.getItem(k); }
  async set(k: string, v: string) { localStorage.setItem(k, v); }
  async remove(k: string) { localStorage.removeItem(k); }
}

class IndexedDbBackend implements StorageBackend {
  private dbp: Promise<IDBDatabase> | null = null;
  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open("nigeria-road-to-presidency", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("kv");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbp;
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const t = db.transaction("kv", mode);
      const r = fn(t.objectStore("kv"));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  async get(k: string) { return ((await this.tx("readonly", (s) => s.get(k))) as string | undefined) ?? null; }
  async set(k: string, v: string) { await this.tx("readwrite", (s) => s.put(v, k)); }
  async remove(k: string) { await this.tx("readwrite", (s) => s.delete(k)); }
}

export function defaultBackend(): StorageBackend {
  if (typeof indexedDB !== "undefined") return new IndexedDbBackend();
  if (typeof localStorage !== "undefined") return new LocalStorageBackend();
  return new MemoryBackend();
}

const key = (slot: SlotId) => `save:${slot}`;

export class SaveSystem {
  constructor(private backend: StorageBackend = defaultBackend()) {}

  async save(slot: SlotId, state: GameState): Promise<SaveSummary> {
    const summary = summarise(state);
    const env: SaveEnvelope = { format: SAVE_FORMAT, simVersion: SIM_VERSION, savedAt: Date.now(), summary, state };
    // write the new data under the slot only after it has serialised successfully
    await this.backend.set(key(slot), serialise(env));
    await this.backend.set(`meta:${slot}`, JSON.stringify({ savedAt: env.savedAt, summary }));
    return summary;
  }

  /** Loads and validates. Throws SaveError for missing/corrupt/incompatible saves. */
  async load(slot: SlotId): Promise<GameState> {
    const text = await this.backend.get(key(slot));
    if (!text) throw new SaveError("That slot is empty.", "missing");
    return deserialise(text).state;
  }

  async list(): Promise<SlotInfo[]> {
    const out: SlotInfo[] = [];
    for (const slot of SLOTS) {
      try {
        const meta = await this.backend.get(`meta:${slot}`);
        if (!meta) { out.push({ slot, empty: true }); continue; }
        const m = JSON.parse(meta) as { savedAt: number; summary: SaveSummary };
        out.push({ slot, empty: false, savedAt: m.savedAt, summary: m.summary });
      } catch {
        out.push({ slot, empty: false, problem: "Slot information is unreadable." });
      }
    }
    return out;
  }

  async delete(slot: SlotId): Promise<void> {
    await this.backend.remove(key(slot));
    await this.backend.remove(`meta:${slot}`);
  }

  async setPref(k: string, v: string) { await this.backend.set(`pref:${k}`, v); }
  async getPref(k: string) { return this.backend.get(`pref:${k}`); }
}
