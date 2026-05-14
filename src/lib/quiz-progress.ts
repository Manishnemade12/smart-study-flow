// Helpers for tracking weak questions and daily streak.
import { supabase } from "@/integrations/supabase/client";

export interface QuizQ {
  question: string;
  type: "mcq";
  options: string[];
  answer: string;
  explanation?: string;
}

export interface QuizAnswer {
  questionIdx: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

// Stable hash for a question (subject-scoped). Uses a fast non-crypto hash on
// the normalized question text so identical questions collide regardless of
// option order.
export function questionHash(q: { question: string }): string {
  const s = (q.question || "").trim().toLowerCase().replace(/\s+/g, " ");
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(13, "0");
}

/**
 * Record a quiz attempt's wrong/right answers into weak_questions.
 * - Wrong answers: increment times_wrong, set last_wrong_at, ensure not mastered.
 * - Right answers that were previously weak: increment times_correct, mark
 *   mastered if times_correct >= 2.
 */
export async function recordWeakAnswers(opts: {
  userId: string;
  subjectId: string;
  questions: QuizQ[];
  answers: QuizAnswer[];
}) {
  const { userId, subjectId, questions, answers } = opts;
  const now = new Date().toISOString();

  // 1) Upsert wrong answers
  const wrong = answers.filter((a) => a.selectedAnswer && !a.isCorrect);
  if (wrong.length) {
    const rows = wrong.map((a) => {
      const q = questions[a.questionIdx];
      const hash = questionHash(q);
      return {
        user_id: userId,
        subject_id: subjectId,
        question_hash: hash,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation ?? null,
        last_wrong_at: now,
        last_seen_at: now,
        mastered: false,
      };
    });

    // Fetch existing to compute times_wrong increment
    const hashes = rows.map((r) => r.question_hash);
    const { data: existing } = await supabase
      .from("weak_questions")
      .select("question_hash, times_wrong, times_correct")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .in("question_hash", hashes);

    const map = new Map((existing ?? []).map((e) => [e.question_hash, e]));
    const upsertRows = rows.map((r) => {
      const ex = map.get(r.question_hash);
      return {
        ...r,
        times_wrong: (ex?.times_wrong ?? 0) + 1,
        times_correct: ex?.times_correct ?? 0,
      };
    });

    await supabase.from("weak_questions").upsert(upsertRows, {
      onConflict: "user_id,subject_id,question_hash",
    });
  }

  // 2) Mark right-answer weak questions as more mastered
  const right = answers.filter((a) => a.selectedAnswer && a.isCorrect);
  if (right.length) {
    const hashes = right.map((a) => questionHash(questions[a.questionIdx]));
    const { data: existing } = await supabase
      .from("weak_questions")
      .select("id, question_hash, times_correct, times_wrong")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .in("question_hash", hashes);

    if (existing && existing.length) {
      for (const row of existing) {
        const newCorrect = (row.times_correct ?? 0) + 1;
        await supabase
          .from("weak_questions")
          .update({
            times_correct: newCorrect,
            last_seen_at: now,
            mastered: newCorrect >= 2,
          })
          .eq("id", row.id);
      }
    }
  }
}

/** Bump the user's streak. Call on quiz completion. */
export async function bumpStreak(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const { data: row } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    await supabase.from("user_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: todayStr,
      total_quizzes_completed: 1,
    });
    return;
  }

  let current = row.current_streak ?? 0;
  const last = row.last_active_date ? new Date(row.last_active_date) : null;
  const totalDone = (row.total_quizzes_completed ?? 0) + 1;

  if (!last) {
    current = 1;
  } else {
    const diffDays = Math.floor(
      (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
        Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      // already counted today, just bump total
    } else if (diffDays === 1) {
      current += 1;
    } else {
      current = 1;
    }
  }

  await supabase
    .from("user_streaks")
    .update({
      current_streak: current,
      longest_streak: Math.max(current, row.longest_streak ?? 0),
      last_active_date: todayStr,
      total_quizzes_completed: totalDone,
    })
    .eq("user_id", userId);
}

/** Fetch top N unmastered weak questions for a subject. */
export async function fetchWeakQuestions(opts: {
  userId: string;
  subjectId: string;
  limit?: number;
  includeMastered?: boolean;
}) {
  let q = supabase
    .from("weak_questions")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("subject_id", opts.subjectId)
    .order("times_wrong", { ascending: false })
    .order("last_wrong_at", { ascending: false })
    .limit(opts.limit ?? 20);
  if (!opts.includeMastered) q = q.eq("mastered", false);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
