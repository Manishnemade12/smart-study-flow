import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Brain, ChevronRight, Flame, Target, Zap, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function WeakTopicsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const data = useStore();
  const [tab, setTab] = useState<"active" | "mastered">("active");

  const { data: weak, isLoading, refetch } = useQuery({
    queryKey: ["weak-questions", user?.id, tab],
    queryFn: async () => {
      let q = supabase
        .from("weak_questions")
        .select("*")
        .eq("user_id", user!.id)
        .order("times_wrong", { ascending: false })
        .order("last_wrong_at", { ascending: false });
      q = tab === "mastered" ? q.eq("mastered", true) : q.eq("mastered", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    (weak ?? []).forEach((w) => {
      const arr = map.get(w.subject_id) ?? [];
      arr.push(w);
      map.set(w.subject_id, arr);
    });
    return Array.from(map.entries()).map(([subjectId, items]) => ({
      subjectId,
      subjectName: data.subjects.find((s) => s.id === subjectId)?.name ?? "Unknown",
      items,
    }));
  }, [weak, data.subjects]);

  async function startDrill(subjectId: string, items: any[]) {
    if (!user) return;
    const questions = items.slice(0, 20).map((w) => ({
      question: w.question,
      type: "mcq",
      options: Array.isArray(w.options) ? w.options : [],
      answer: w.answer,
      explanation: w.explanation ?? "Previously missed.",
    })).filter((q) => q.options.length === 4);

    if (!questions.length) {
      toast.error("Not enough valid weak questions to drill");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: ins, error } = await supabase
      .from("daily_quizzes")
      .upsert({
        user_id: user.id,
        subject_id: subjectId,
        quiz_date: today,
        questions,
        total_questions: questions.length,
        difficulty: "medium",
        source: "manual",
      }, { onConflict: "user_id,subject_id,quiz_date" })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/daily-quiz/$subjectId", params: { subjectId }, search: { quizId: ins.id, timer: Math.max(5, questions.length) } });
  }

  async function removeWeak(id: string) {
    await supabase.from("weak_questions").delete().eq("id", id);
    toast.success("Removed from weak list");
    refetch();
  }

  async function markMastered(id: string) {
    await supabase.from("weak_questions").update({ mastered: true, times_correct: 99 }).eq("id", id);
    refetch();
  }

  return (
    <AppLayout>
      <div className="px-3 sm:px-6 py-6 max-w-5xl mx-auto">
        <Link to="/daily-quiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Quiz Hub
        </Link>

        <div className="rounded-2xl p-5 sm:p-7 mb-6 border bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">Weak Topic Drill</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Questions you've missed before. Drill them now — get any one right twice and we'll mark it mastered.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2"><Target className="w-4 h-4" /> Active</TabsTrigger>
            <TabsTrigger value="mastered" className="gap-2"><CheckCircle2 className="w-4 h-4" /> Mastered</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : grouped.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <Brain className="w-10 h-10 mx-auto opacity-50" />
              <p>{tab === "active" ? "No weak questions yet — keep practicing!" : "No mastered questions yet."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <Card key={g.subjectId}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{g.subjectName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.items.length} weak {g.items.length === 1 ? "question" : "questions"}</p>
                  </div>
                  {tab === "active" && (
                    <Button size="sm" className="gap-1.5 shrink-0" onClick={() => startDrill(g.subjectId, g.items)}
                      style={{ background: "var(--gradient-primary)" }}>
                      <Zap className="w-4 h-4" /> Drill now
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="max-h-72">
                    <div className="space-y-2 pr-3">
                      {g.items.map((w) => (
                        <div key={w.id} className="p-3 rounded-lg border bg-card/50 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{w.question}</p>
                            <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                              <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                                Wrong × {w.times_wrong}
                              </Badge>
                              {w.times_correct > 0 && (
                                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                                  Right × {w.times_correct}
                                </Badge>
                              )}
                              {w.last_wrong_at && (
                                <span className="text-muted-foreground">
                                  Last missed {new Date(w.last_wrong_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {tab === "active" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Mark mastered"
                                onClick={() => markMastered(w.id)}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-rose-400" title="Remove"
                              onClick={() => removeWeak(w.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
