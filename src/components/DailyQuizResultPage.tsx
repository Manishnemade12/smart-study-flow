import { useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, CheckCircle2, XCircle, RotateCw, Home, BookOpen, Sparkles } from "lucide-react";

interface QuizQ {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}
interface QuizAns {
  questionIdx: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

function fmtSecs(s: number | null) {
  if (!s && s !== 0) return "—";
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function DailyQuizResultPage() {
  const search = useSearch({ from: "/daily-quiz-result" });
  const navigate = useNavigate();
  const data = useStore();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["dq-attempt", search.attemptId],
    queryFn: async () => {
      if (!search.attemptId) return null;
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("*, daily_quiz:daily_quiz_id(*)")
        .eq("id", search.attemptId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!search.attemptId,
  });

  const quiz = (attempt as any)?.daily_quiz;
  const questions: QuizQ[] = (quiz?.questions as any) ?? [];
  const userAnswers: QuizAns[] = (attempt?.answers as any) ?? [];
  const subjectName = data.subjects.find(s => s.id === attempt?.subject_id)?.name ?? "Subject";

  const stats = useMemo(() => {
    const pct = Number(attempt?.percentage ?? search.percentage ?? 0);
    const score = attempt?.score ?? search.score ?? 0;
    const total = attempt?.total_questions ?? questions.length ?? 0;
    const correct = userAnswers.filter(a => a.isCorrect).length;
    const wrong = userAnswers.filter(a => a.selectedAnswer && !a.isCorrect).length;
    const skipped = userAnswers.filter(a => !a.selectedAnswer).length;
    return { pct, score, total, correct, wrong, skipped };
  }, [attempt, questions, userAnswers, search]);

  const grade = stats.pct >= 90 ? { g: "A+", t: "Excellent!", c: "text-emerald-400" }
    : stats.pct >= 75 ? { g: "A", t: "Great job!", c: "text-emerald-400" }
    : stats.pct >= 60 ? { g: "B", t: "Good effort", c: "text-amber-400" }
    : stats.pct >= 40 ? { g: "C", t: "Keep practicing", c: "text-amber-400" }
    : { g: "D", t: "More revision needed", c: "text-rose-400" };

  if (isLoading) {
    return <AppLayout><div className="p-6 max-w-3xl mx-auto"><Skeleton className="h-96 rounded-xl" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="px-3 sm:px-6 py-6 max-w-3xl mx-auto space-y-6">
        {/* Score hero */}
        <Card className="overflow-hidden">
          <div className="p-6 sm:p-8 text-center" style={{ background: "var(--gradient-primary)" }}>
            <div className="text-primary-foreground space-y-3">
              <Trophy className="w-10 h-10 mx-auto opacity-90" />
              <h1 className="text-2xl sm:text-3xl font-bold">{grade.t}</h1>
              <div className="text-5xl sm:text-6xl font-extrabold">{stats.pct.toFixed(0)}%</div>
              <p className="text-sm opacity-90">{subjectName} · {stats.score}/{stats.total} correct</p>
            </div>
          </div>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6">
            <Stat label="Correct" value={stats.correct} tone="text-emerald-400" />
            <Stat label="Wrong" value={stats.wrong} tone="text-rose-400" />
            <Stat label="Skipped" value={stats.skipped} tone="text-muted-foreground" />
            <Stat label="Time" value={fmtSecs(attempt?.time_taken ?? null)} tone="" />
          </CardContent>
          <div className="px-4 sm:px-6 pb-4">
            <Progress value={stats.pct} className="h-2" />
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {attempt && (
            <Button className="flex-1 gap-2" style={{ background: "var(--gradient-primary)" }}
              onClick={() => navigate({
                to: "/daily-quiz/$subjectId",
                params: { subjectId: attempt.subject_id },
                search: { quizId: attempt.daily_quiz_id, timer: 10 },
              })}>
              <RotateCw className="w-4 h-4" /> Retry quiz
            </Button>
          )}
          <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate({ to: "/daily-quiz" })}>
            <Home className="w-4 h-4" /> Quiz Hub
          </Button>
        </div>

        {/* Weak topics tip */}
        {stats.wrong > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Focus area</p>
                <p className="text-muted-foreground">
                  You missed {stats.wrong} {stats.wrong === 1 ? "question" : "questions"} in <span className="text-foreground">{subjectName}</span>.
                  Review the explanations below and retry to lock the concepts in.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review */}
        {questions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Review answers
            </h2>
            {questions.map((q, i) => {
              const ua = userAnswers.find(a => a.questionIdx === i);
              const selected = ua?.selectedAnswer ?? "";
              const correct = q.answer;
              const isRight = selected === correct;
              const skipped = !selected;
              return (
                <Card key={i} className={isRight ? "border-emerald-500/30" : skipped ? "border-border" : "border-rose-500/30"}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">Q{i + 1}</Badge>
                      <CardTitle className="text-sm font-normal leading-relaxed">{q.question}</CardTitle>
                      {isRight ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        : skipped ? <Badge variant="outline" className="text-muted-foreground">Skipped</Badge>
                        : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isCorrect = opt === correct;
                      const isSelected = opt === selected;
                      return (
                        <div key={oi} className={`p-2.5 rounded-md border text-sm flex items-center gap-2 ${
                          isCorrect ? "border-emerald-500/40 bg-emerald-500/10"
                          : isSelected ? "border-rose-500/40 bg-rose-500/10"
                          : "border-border"
                        }`}>
                          <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                        </div>
                      );
                    })}
                    {q.explanation && (
                      <div className="text-xs text-muted-foreground bg-accent/30 p-2.5 rounded-md mt-2">
                        <span className="font-medium text-foreground">Explanation: </span>{q.explanation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" /> Completed {attempt?.completed_at ? new Date(attempt.completed_at).toLocaleString() : "now"}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="text-center p-3 rounded-lg border bg-card">
      <div className={`text-xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
