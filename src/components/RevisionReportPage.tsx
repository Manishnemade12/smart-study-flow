import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Flame, TrendingUp, AlertTriangle } from "lucide-react";

export function RevisionReportPage() {
  const { user } = useAuth();
  const data = useStore();

  const { data: weak, isLoading: loadingWeak } = useQuery({
    queryKey: ["revision-weak", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weak_questions")
        .select("subject_id, times_wrong, times_correct, mastered, last_wrong_at, question")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["revision-attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("subject_id, percentage, score, total_questions, completed_at")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const subjectStats = useMemo(() => {
    const stats = new Map<string, {
      subjectId: string;
      subjectName: string;
      attempts: number;
      avgPct: number;
      lastPct: number | null;
      activeWeak: number;
      mastered: number;
      totalWrongs: number;
    }>();

    for (const s of data.subjects) {
      stats.set(s.id, {
        subjectId: s.id,
        subjectName: s.name,
        attempts: 0,
        avgPct: 0,
        lastPct: null,
        activeWeak: 0,
        mastered: 0,
        totalWrongs: 0,
      });
    }

    const sumByS = new Map<string, number>();
    (attempts ?? []).forEach((a) => {
      const st = stats.get(a.subject_id);
      if (!st) return;
      st.attempts += 1;
      sumByS.set(a.subject_id, (sumByS.get(a.subject_id) ?? 0) + Number(a.percentage || 0));
      if (st.lastPct === null) st.lastPct = Number(a.percentage || 0);
    });
    sumByS.forEach((v, k) => {
      const st = stats.get(k);
      if (st && st.attempts) st.avgPct = v / st.attempts;
    });

    (weak ?? []).forEach((w) => {
      const st = stats.get(w.subject_id);
      if (!st) return;
      if (w.mastered) st.mastered += 1;
      else st.activeWeak += 1;
      st.totalWrongs += w.times_wrong ?? 0;
    });

    return Array.from(stats.values())
      .filter((s) => s.attempts > 0 || s.activeWeak > 0)
      .sort((a, b) => b.activeWeak - a.activeWeak);
  }, [weak, attempts, data.subjects]);

  const totals = useMemo(() => {
    const totalAttempts = (attempts ?? []).length;
    const totalCorrect = (attempts ?? []).reduce((s, a) => s + (a.score ?? 0), 0);
    const totalQ = (attempts ?? []).reduce((s, a) => s + (a.total_questions ?? 0), 0);
    const accuracy = totalQ ? (totalCorrect / totalQ) * 100 : 0;
    const activeWeak = (weak ?? []).filter((w) => !w.mastered).length;
    const mastered = (weak ?? []).filter((w) => w.mastered).length;
    return { totalAttempts, accuracy, activeWeak, mastered };
  }, [attempts, weak]);

  const isLoading = loadingWeak || loadingAttempts;

  return (
    <AppLayout>
      <div className="px-3 sm:px-6 py-6 max-w-5xl mx-auto">
        <Link to="/daily-quiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Quiz Hub
        </Link>

        <div className="rounded-2xl p-5 sm:p-7 mb-6 border bg-gradient-to-br from-primary/15 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Revision Report</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Subject-wise performance and weak spots. Use this to focus your next study session.
              </p>
            </div>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Overall accuracy" value={`${totals.accuracy.toFixed(0)}%`} />
          <Stat icon={<Flame className="w-4 h-4 text-amber-400" />} label="Active weak Qs" value={totals.activeWeak} />
          <Stat icon={<BookOpen className="w-4 h-4 text-primary" />} label="Quizzes taken" value={totals.totalAttempts} />
          <Stat icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Mastered" value={totals.mastered} />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : subjectStats.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <AlertTriangle className="w-10 h-10 mx-auto opacity-50" />
              <p>No quiz data yet. Take a quiz to see your revision report.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {subjectStats.map((s) => {
              const tone = s.avgPct >= 75 ? "text-emerald-400" : s.avgPct >= 50 ? "text-amber-400" : "text-rose-400";
              return (
                <Card key={s.subjectId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{s.subjectName}</CardTitle>
                      <div className="flex gap-1.5 shrink-0">
                        {s.activeWeak > 0 && (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                            {s.activeWeak} weak
                          </Badge>
                        )}
                        {s.mastered > 0 && (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                            {s.mastered} mastered
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${tone} w-16`}>{s.avgPct.toFixed(0)}%</div>
                      <div className="flex-1">
                        <Progress value={s.avgPct} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1.5">
                          {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                          {s.lastPct !== null && <> · last {s.lastPct.toFixed(0)}%</>}
                          {s.totalWrongs > 0 && <> · {s.totalWrongs} total mistakes</>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
