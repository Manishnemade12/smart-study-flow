import { supabase } from "@/integrations/supabase/client";
import type { Chunk, Subject, QuizQuestion, Term } from "./types";

// Row shapes from DB
type SubjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};
type ChunkRow = {
  id: string;
  user_id: string;
  subject_id: string;
  parent_chunk_id: string | null;
  title: string;
  order: number;
  summary: string;
  notes: string;
  key_points: string[];
  terms: Term[];
  revised: boolean;
  created_at: string;
  updated_at: string;
};
type QuizRow = {
  id: string;
  user_id: string;
  chunk_id: string;
  question: string;
  type: "mcq" | "true_false" | "one_line";
  options: string[] | null;
  answer: string;
  explanation: string | null;
  order: number;
};

function toSubject(r: SubjectRow): Subject {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: new Date(r.created_at).getTime(),
  };
}
function toChunk(r: ChunkRow, quiz: QuizQuestion[]): Chunk {
  return {
    id: r.id,
    subjectId: r.subject_id,
    parentChunkId: r.parent_chunk_id,
    title: r.title,
    order: r.order,
    summary: r.summary,
    notes: r.notes,
    keyPoints: r.key_points ?? [],
    terms: r.terms ?? [],
    quiz,
    revised: r.revised,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}
function toQuiz(r: QuizRow): QuizQuestion {
  return {
    id: r.id,
    question: r.question,
    type: r.type,
    options: r.options ?? undefined,
    answer: r.answer,
    explanation: r.explanation ?? undefined,
  };
}

export async function fetchAll(): Promise<{ subjects: Subject[]; chunks: Chunk[] }> {
  const [{ data: subjects, error: e1 }, { data: chunks, error: e2 }, { data: quiz, error: e3 }] =
    await Promise.all([
      supabase.from("subjects").select("*").order("created_at", { ascending: true }),
      supabase.from("chunks").select("*").order("order", { ascending: true }),
      supabase.from("quiz_questions").select("*").order("order", { ascending: true }),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  const quizByChunk = new Map<string, QuizQuestion[]>();
  for (const q of (quiz ?? []) as QuizRow[]) {
    const list = quizByChunk.get(q.chunk_id) ?? [];
    list.push(toQuiz(q));
    quizByChunk.set(q.chunk_id, list);
  }
  return {
    subjects: ((subjects ?? []) as unknown as SubjectRow[]).map(toSubject),
    chunks: ((chunks ?? []) as unknown as ChunkRow[]).map((c) => toChunk(c, quizByChunk.get(c.id) ?? [])),
  };
}

export async function importTree(
  userId: string,
  tree: { subjects: Array<{ name: string; description?: string; chunks: any[] }> },
  target?: { subjectId?: string; parentChunkId?: string },
) {
  // If targeting a parent chunk, all incoming chunks become children of that chunk
  if (target?.parentChunkId) {
    const { data: parent, error: pErr } = await supabase
      .from("chunks")
      .select("subject_id")
      .eq("id", target.parentChunkId)
      .single();
    if (pErr) throw pErr;
    const subjectId = parent.subject_id;

    const { count } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("parent_chunk_id", target.parentChunkId);
    let baseOrder = count ?? 0;

    const flat = tree.subjects.flatMap((s) => s.chunks);
    for (let i = 0; i < flat.length; i++) {
      const c = flat[i];
      const { data: row, error } = await supabase
        .from("chunks")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          parent_chunk_id: target.parentChunkId,
          title: c.title,
          order: baseOrder + i,
          summary: c.summary ?? "",
          notes: c.notes ?? "",
          key_points: c.keyPoints ?? [],
          terms: c.terms ?? [],
        })
        .select("id")
        .single();
      if (error) throw error;
      const quizRows = (c.quiz ?? []).map((q: any, qi: number) => ({
        user_id: userId,
        chunk_id: row.id,
        question: q.question,
        type: q.type,
        options: q.options ?? null,
        answer: q.answer,
        explanation: q.explanation ?? null,
        order: qi,
      }));
      if (quizRows.length) {
        const { error: qErr } = await supabase.from("quiz_questions").insert(quizRows);
        if (qErr) throw qErr;
      }
    }
    return;
  }

  for (const s of tree.subjects) {
    let subjectId: string | undefined = target?.subjectId;
    if (!subjectId) {
      // Find existing subject by name (case-insensitive)
      const { data: existing } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", s.name)
        .maybeSingle();
      subjectId = existing?.id;
    }
    if (!subjectId) {
      const { data, error } = await supabase
        .from("subjects")
        .insert({ user_id: userId, name: s.name, description: s.description ?? "" })
        .select("id")
        .single();
      if (error) throw error;
      subjectId = data.id;
    }

    const { count } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subjectId)
      .is("parent_chunk_id", null);
    const baseOrder = count ?? 0;

    for (let i = 0; i < s.chunks.length; i++) {
      const c = s.chunks[i];
      const { data: parent, error: pErr } = await supabase
        .from("chunks")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          parent_chunk_id: null,
          title: c.title,
          order: baseOrder + i,
          summary: c.summary ?? "",
          notes: c.notes ?? "",
          key_points: c.keyPoints ?? [],
          terms: c.terms ?? [],
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const parentId = parent.id;

      const quizRows = (c.quiz ?? []).map((q: any, qi: number) => ({
        user_id: userId,
        chunk_id: parentId,
        question: q.question,
        type: q.type,
        options: q.options ?? null,
        answer: q.answer,
        explanation: q.explanation ?? null,
        order: qi,
      }));
      if (quizRows.length) {
        const { error: qErr } = await supabase.from("quiz_questions").insert(quizRows);
        if (qErr) throw qErr;
      }

      for (let ci = 0; ci < (c.children ?? []).length; ci++) {
        const child = c.children[ci];
        const { data: childRow, error: cErr } = await supabase
          .from("chunks")
          .insert({
            user_id: userId,
            subject_id: subjectId,
            parent_chunk_id: parentId,
            title: child.title,
            order: ci,
            summary: child.summary ?? "",
            notes: child.notes ?? "",
            key_points: child.keyPoints ?? [],
            terms: child.terms ?? [],
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        const childQuiz = (child.quiz ?? []).map((q: any, qi: number) => ({
          user_id: userId,
          chunk_id: childRow.id,
          question: q.question,
          type: q.type,
          options: q.options ?? null,
          answer: q.answer,
          explanation: q.explanation ?? null,
          order: qi,
        }));
        if (childQuiz.length) {
          const { error: qErr2 } = await supabase.from("quiz_questions").insert(childQuiz);
          if (qErr2) throw qErr2;
        }
      }
    }
  }
}

export async function updateChunk(id: string, patch: Partial<Chunk>) {
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.summary !== undefined) dbPatch.summary = patch.summary;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.keyPoints !== undefined) dbPatch.key_points = patch.keyPoints;
  if (patch.terms !== undefined) dbPatch.terms = patch.terms;
  if (patch.revised !== undefined) dbPatch.revised = patch.revised;
  if (patch.order !== undefined) dbPatch.order = patch.order;
  const { error } = await supabase.from("chunks").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteChunk(id: string) {
  const { error } = await supabase.from("chunks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function createChunkManual(
  userId: string,
  input: {
    subjectId?: string;
    newSubjectName?: string;
    parentChunkId?: string;
    title: string;
    summary?: string;
    notes?: string;
    keyPoints?: string[];
  },
): Promise<string> {
  let subjectId = input.subjectId;

  // Resolve subject from parent chunk if provided
  if (!subjectId && input.parentChunkId) {
    const { data: parent, error } = await supabase
      .from("chunks").select("subject_id").eq("id", input.parentChunkId).single();
    if (error) throw error;
    subjectId = parent.subject_id;
  }

  // Create new subject if needed
  if (!subjectId) {
    const name = (input.newSubjectName ?? "").trim();
    if (!name) throw new Error("Choose a subject or enter a new subject name");
    const { data: existing } = await supabase
      .from("subjects").select("id").eq("user_id", userId).ilike("name", name).maybeSingle();
    if (existing?.id) {
      subjectId = existing.id;
    } else {
      const { data, error } = await supabase
        .from("subjects").insert({ user_id: userId, name, description: "" }).select("id").single();
      if (error) throw error;
      subjectId = data.id;
    }
  }

  // Compute next order
  const orderQuery = supabase
    .from("chunks").select("id", { count: "exact", head: true }).eq("subject_id", subjectId);
  const { count } = await (input.parentChunkId
    ? orderQuery.eq("parent_chunk_id", input.parentChunkId)
    : orderQuery.is("parent_chunk_id", null));

  const { data: row, error } = await supabase
    .from("chunks")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      parent_chunk_id: input.parentChunkId ?? null,
      title: input.title.trim() || "Untitled",
      order: count ?? 0,
      summary: input.summary ?? "",
      notes: input.notes ?? "",
      key_points: input.keyPoints ?? [],
      terms: [],
    })
    .select("id")
    .single();
  if (error) throw error;
  return row.id;
}