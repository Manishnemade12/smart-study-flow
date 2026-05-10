import { useEffect, useState, useSyncExternalStore } from "react";
import type { AppData, Chunk, Subject } from "./types";

const KEY = "ssc-smart-notes-v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): AppData {
  if (typeof window === "undefined") return { subjects: [], chunks: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { subjects: [], chunks: [] };
    return JSON.parse(raw) as AppData;
  } catch {
    return { subjects: [], chunks: [] };
  }
}

let state: AppData = { subjects: [], chunks: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    state = load();
    hydrated = true;
  }
}

export const store = {
  getSnapshot: (): AppData => state,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  importTree(tree: { subjects: Array<{ name: string; description?: string; chunks: any[] }> }) {
    ensureHydrated();
    const now = Date.now();
    for (const s of tree.subjects) {
      // Merge into existing subject by name if present, else create
      let subj = state.subjects.find((x) => x.name.toLowerCase() === s.name.toLowerCase());
      if (!subj) {
        subj = { id: uid(), name: s.name, description: s.description ?? "", createdAt: now };
        state.subjects.push(subj);
      }
      const baseOrder = state.chunks.filter((c) => c.subjectId === subj!.id && !c.parentChunkId).length;
      s.chunks.forEach((c, i) => {
        const parentId = uid();
        state.chunks.push({
          id: parentId,
          subjectId: subj!.id,
          parentChunkId: null,
          title: c.title,
          order: baseOrder + i,
          summary: c.summary ?? "",
          notes: c.notes ?? "",
          keyPoints: c.keyPoints ?? [],
          terms: c.terms ?? [],
          quiz: (c.quiz ?? []).map((q: any) => ({ ...q, id: uid() })),
          revised: false,
          createdAt: now,
          updatedAt: now,
        });
        (c.children ?? []).forEach((child: any, ci: number) => {
          state.chunks.push({
            id: uid(),
            subjectId: subj!.id,
            parentChunkId: parentId,
            title: child.title,
            order: ci,
            summary: child.summary ?? "",
            notes: child.notes ?? "",
            keyPoints: child.keyPoints ?? [],
            terms: child.terms ?? [],
            quiz: (child.quiz ?? []).map((q: any) => ({ ...q, id: uid() })),
            revised: false,
            createdAt: now,
            updatedAt: now,
          });
        });
      });
    }
    persist();
  },
  updateChunk(id: string, patch: Partial<Chunk>) {
    ensureHydrated();
    state.chunks = state.chunks.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
    );
    persist();
  },
  deleteChunk(id: string) {
    ensureHydrated();
    const toDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of state.chunks) {
        if (c.parentChunkId && toDelete.has(c.parentChunkId) && !toDelete.has(c.id)) {
          toDelete.add(c.id);
          added = true;
        }
      }
    }
    state.chunks = state.chunks.filter((c) => !toDelete.has(c.id));
    persist();
  },
  deleteSubject(id: string) {
    ensureHydrated();
    state.subjects = state.subjects.filter((s) => s.id !== id);
    state.chunks = state.chunks.filter((c) => c.subjectId !== id);
    persist();
  },
  addEmptyChunk(subjectId: string, parentChunkId: string | null = null): Chunk {
    ensureHydrated();
    const now = Date.now();
    const order = state.chunks.filter(
      (c) => c.subjectId === subjectId && c.parentChunkId === parentChunkId,
    ).length;
    const chunk: Chunk = {
      id: uid(),
      subjectId,
      parentChunkId,
      title: "Untitled chunk",
      order,
      summary: "",
      notes: "",
      keyPoints: [],
      terms: [],
      quiz: [],
      revised: false,
      createdAt: now,
      updatedAt: now,
    };
    state.chunks.push(chunk);
    persist();
    return chunk;
  },
  addSubject(name: string): Subject {
    ensureHydrated();
    const s: Subject = { id: uid(), name, description: "", createdAt: Date.now() };
    state.subjects.push(s);
    persist();
    return s;
  },
  reset() {
    state = { subjects: [], chunks: [] };
    persist();
  },
};

export function useStore(): AppData {
  // SSR-safe: start with empty state on server, hydrate after mount
  const [snap, setSnap] = useState<AppData>(state);
  useEffect(() => {
    ensureHydrated();
    setSnap({ ...state });
    const unsub = store.subscribe(() => setSnap({ ...state }));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}

export { uid };