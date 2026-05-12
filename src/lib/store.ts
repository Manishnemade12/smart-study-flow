import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAll, importTree as dbImportTree, updateChunk as dbUpdateChunk, deleteChunk as dbDeleteChunk, deleteSubject as dbDeleteSubject, createChunkManual as dbCreateChunkManual, createSubject as dbCreateSubject } from "./db";
import type { AppData, Chunk } from "./types";
import { useAuth } from "./auth";

export const QUERY_KEY = ["study-data"] as const;

export function useStore(): AppData {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAll,
    enabled: !!user,
    staleTime: 30_000,
  });
  return data ?? { subjects: [], chunks: [] };
}

export function useStoreActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    async importTree(tree: any, target?: { subjectId?: string; parentChunkId?: string }) {
      if (!user) throw new Error("Not signed in");
      await dbImportTree(user.id, tree, target);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    async updateChunk(id: string, patch: Partial<Chunk>) {
      await dbUpdateChunk(id, patch);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    async deleteChunk(id: string) {
      await dbDeleteChunk(id);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    async deleteSubject(id: string) {
      await dbDeleteSubject(id);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    async createChunkManual(input: Parameters<typeof dbCreateChunkManual>[1]) {
      if (!user) throw new Error("Not signed in");
      const id = await dbCreateChunkManual(user.id, input);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      return id;
    },
    async createSubject(name: string) {
      if (!user) throw new Error("Not signed in");
      const id = await dbCreateSubject(user.id, name);
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      return id;
    },
  };
}