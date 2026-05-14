import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Flag, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { recordWeakAnswers, bumpStreak } from "@/lib/quiz-progress";

interface QuizQ {
  question: string;
  type: "mcq";
  options: string[];
  answer: string;
  explanation?: string;
}

interface DailyQuizRow {
  id: string;
  subject_id: string;
  quiz_date: string;
  difficulty: string;
  questions: unknown;
}

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function DailyQuizContainer() {
  const { subjectId } = useParams({ from: "/daily-quiz/$subjectId" });
  const search = useSearch({ from: "/daily-quiz/$subjectId" }) as {
    quizId?: string;
    timer?: number;
  };
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const data = useStore();

  const subjectName = data.subjects.find((s) => s.id === subjectId)?.name ?? "Quiz";
  const timerMin = search.timer ?? 10;
  const today = new Date().toISOString().split("T")[0];

  const {
    data: quiz,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dq-quiz", user?.id ?? "guest", search.quizId ?? "today", subjectId, today],
    queryFn: async (): Promise<DailyQuizRow | null> => {
      if (!user) return null;

      let query = supabase.from("daily_quizzes").select("*").eq("user_id", user.id);

      if (search.quizId) {
        query = query.eq("id", search.quizId);
      } else {
        query = query.eq("subject_id", subjectId).eq("quiz_date", today);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as DailyQuizRow | null;
    },
    enabled: !!user && !!subjectId,
  });

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (error || !quiz) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-muted-foreground">Quiz not found or has no questions.</p>
              <Button onClick={() => navigate({ to: "/daily-quiz" })}>Back to Quizzes</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <DailyQuizPlayer
      key={`${quiz.id}-${timerMin}`}
      quiz={quiz}
      subjectName={subjectName}
      timerMin={timerMin}
    />
  );
}

function DailyQuizPlayer({
  quiz,
  subjectName,
  timerMin,
}: {
  quiz: DailyQuizRow;
  subjectName: string;
  timerMin: number;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const questions = Array.isArray(quiz.questions) ? (quiz.questions as unknown as QuizQ[]) : [];
  const total = questions.length;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(timerMin * 60);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (!submittedRef.current) {
            submittedRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  async function handleSubmit(auto = false) {
    if (!user || submitting) return;
    setSubmitting(true);

    try {
      const ans = questions.map((q, i) => {
        const selected = answers[i] ?? "";
        return {
          questionIdx: i,
          selectedAnswer: selected,
          isCorrect: selected === q.answer,
        };
      });

      const score = ans.filter((a) => a.isCorrect).length;
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const { data: attempt, error } = await supabase
        .from("daily_quiz_attempts")
        .insert({
          user_id: user.id,
          daily_quiz_id: quiz.id,
          subject_id: quiz.subject_id,
          quiz_date: quiz.quiz_date,
          answers: ans,
          score,
          total_questions: total,
          time_taken: timeTaken,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      if (auto) toast.info("Time's up — quiz auto-submitted");

      // Track weak answers and streak (best-effort, non-blocking on errors)
      try {
        await recordWeakAnswers({
          userId: user.id,
          subjectId: quiz.subject_id,
          questions,
          answers: ans,
        });
        await bumpStreak(user.id);
      } catch (err) {
        console.warn("progress tracking failed", err);
      }

      navigate({ to: "/daily-quiz-result", search: { attemptId: attempt.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit";
      toast.error(message);
      setSubmitting(false);
      submittedRef.current = false;
    }
  }

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPct = ((idx + 1) / total) * 100;
  const lowTime = secondsLeft <= 60;
  const q = questions[idx];

  if (total === 0 || !q) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-muted-foreground">Quiz questions are missing or invalid.</p>
              <Button onClick={() => navigate({ to: "/daily-quiz" })}>Back to Quizzes</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto">
        <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-background/90 backdrop-blur border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold truncate">{subjectName}</span>
                <Badge variant="outline" className="capitalize">
                  {quiz.difficulty}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Question {idx + 1} of {total} · {answeredCount} answered
              </div>
            </div>
            <div
              className={`flex items-center gap-1.5 font-mono text-sm font-semibold px-3 py-1.5 rounded-lg border ${lowTime ? "text-rose-400 border-rose-500/40 bg-rose-500/10" : "text-foreground border-border"}`}
            >
              <Clock className="w-4 h-4" /> {fmtClock(secondsLeft)}
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5 mt-3" />
        </div>

        <Card className="mb-4">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
                {idx + 1}
              </div>
              <p className="text-base sm:text-lg leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[idx] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [idx]: opt })}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all flex items-start gap-3 ${
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border hover:border-primary/50 hover:bg-accent/40"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm sm:text-base">{opt}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1 sm:flex-none gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            disabled={idx === total - 1}
            className="flex-1 sm:flex-none gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-auto hidden sm:block">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="gap-2"
              style={{ background: "var(--gradient-primary)" }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Flag className="w-3 h-3" /> Question palette
              </span>
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{total} done
              </span>
            </div>
            <ScrollArea className="max-h-32">
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                {questions.map((_, i) => {
                  const done = !!answers[i];
                  const active = i === idx;
                  return (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`aspect-square rounded-md text-xs font-semibold border transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : done
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="sm:hidden sticky bottom-0 -mx-3 px-3 py-3 bg-background/95 backdrop-blur border-t">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="w-full gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Quiz
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
