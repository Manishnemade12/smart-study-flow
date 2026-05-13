import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { AppLayout } from "@/components/AppLayout";
import { QuizGenerateDialog } from "@/components/quiz/QuizGenerateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Trophy, Clock, BookOpen, Play, History, Target, TrendingUp, ChevronRight } from "lucide-react";

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  hard: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function fmtSecs(s: number | null) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export function DailyQuizPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const data = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: todayQuizzes, isLoading: loadingToday } = useQuery({
    queryKey: ["dq-today", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quizzes")
        .select("id, subject_id, total_questions, difficulty, created_at, source")
        .eq("user_id", user!.id)
        .eq("quiz_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["dq-attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("id, daily_quiz_id, subject_id, quiz_date, score, total_questions, percentage, time_taken, completed, completed_at, started_at")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalAttempts = attempts?.length ?? 0;
  const avgScore = attempts && attempts.length
    ? attempts.reduce((s, a) => s + Number(a.percentage || 0), 0) / attempts.length
    : 0;
  const bestScore = attempts && attempts.length
    ? Math.max(...attempts.map(a => Number(a.percentage || 0)))
    : 0;

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? "Subject";

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-6 sm:p-8 mb-6 border" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-primary-foreground">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-7 h-7" /> SSC Quiz Hub
              </h1>
              <p className="opacity-90 mt-1 text-sm sm:text-base">
                Generate and practice SSC-style MCQ tests from your notes — anytime.
              </p>
            </div>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2"
              onClick={() => setDialogOpen(true)}>
              <Sparkles className="w-4 h-4" /> Generate Quiz
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard icon={<History className="w-4 h-4" />} label="Total attempts" value={totalAttempts} />
          <StatCard icon={<Trophy className="w-4 h-4 text-amber-400" />} label="Best score" value={`${bestScore.toFixed(0)}%`} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Avg score" value={`${avgScore.toFixed(0)}%`} />
          <StatCard icon={<BookOpen className="w-4 h-4 text-primary" />} label="Today's quizzes" value={todayQuizzes?.length ?? 0} />
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-grid">
            <TabsTrigger value="today" className="gap-2"><Play className="w-4 h-4" /> Today</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {loadingToday ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : !todayQuizzes || todayQuizzes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-3">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No quizzes generated today yet.</p>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2"
                    style={{ background: "var(--gradient-primary)" }}>
                    <Sparkles className="w-4 h-4" /> Generate your first quiz
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayQuizzes.map((q) => {
                  const att = attempts?.filter(a => a.daily_quiz_id === q.id) ?? [];
                  const best = att.length ? Math.max(...att.map(a => Number(a.percentage || 0))) : null;
                  return (
                    <Card key={q.id} className="hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => navigate({
                        to: "/daily-quiz/$subjectId",
                        params: { subjectId: q.subject_id },
                        search: { quizId: q.id, timer: 10 },
                      })}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{subjectName(q.subject_id)}</CardTitle>
                          <Badge variant="outline" className={difficultyColors[q.difficulty] || ""}>
                            {q.difficulty}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {q.total_questions} questions · {new Date(q.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex items-center justify-between">
                        <div className="text-sm">
                          {att.length ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5" /> Best {best?.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not attempted</span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1 group-hover:text-primary">
                          {att.length ? "Retry" : "Start"} <ChevronRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loadingAttempts ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : !attempts || attempts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No quiz attempts yet. Take a quiz to build your history.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {attempts.map((a) => {
                  const pct = Number(a.percentage || 0);
                  const tone = pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400";
                  return (
                    <Card key={a.id} className="hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => navigate({ to: "/daily-quiz-result", search: { attemptId: a.id } })}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-card border flex items-center justify-center font-bold ${tone}`}>
                          {pct.toFixed(0)}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{subjectName(a.subject_id)}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span>{a.score}/{a.total_questions} correct</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtSecs(a.time_taken)}</span>
                            <span>{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : a.quiz_date}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <QuizGenerateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
