import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { useAddContent } from "@/lib/add-content";
import { Sparkles, BookOpen, ListChecks, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaInstallCard } from "@/components/PwaInstallCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSC Smart Notes — AI-organized study chunks" },
      { name: "description", content: "Paste ChatGPT conversations and turn them into structured SSC exam study notes with AI." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppLayout>
      <DashboardBody />
    </AppLayout>
  );
}

function DashboardBody() {
  const data = useStore();
  const openAdd = useAddContent();

  const stats = useMemo(() => {
    const total = data.chunks.length;
    const revised = data.chunks.filter((c) => c.revised).length;
    const totalQuiz = data.chunks.reduce((acc, c) => acc + c.quiz.length, 0);
    return { total, revised, totalQuiz, subjects: data.subjects.length };
  }, [data]);

  const recent = [...data.chunks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-10">
        <section className="rounded-2xl p-6 md:p-8 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" /> AI-powered study organizer
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">Turn long ChatGPT chats into perfectly organized SSC notes.</h1>
            <p className="mt-3 text-sm md:text-base text-primary-foreground/85">Paste any conversation. We detect subjects, chapters, key terms and quiz questions — instantly.</p>
            <Button onClick={() => openAdd()} variant="secondary" className="mt-6 gap-2">
              <Plus className="w-4 h-4" /> Add new content
            </Button>
          </div>
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="Subjects" value={stats.subjects} />
          <StatCard icon={<ListChecks className="w-4 h-4" />} label="Chunks" value={stats.total} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Revised" value={`${stats.revised}/${stats.total || 0}`} />
          <StatCard icon={<Sparkles className="w-4 h-4" />} label="Quiz questions" value={stats.totalQuiz} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Recently updated</h2>
          {recent.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-12 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium">No notes yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Paste your first ChatGPT conversation to get started.</p>
              <Button onClick={() => openAdd()} className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                <Plus className="w-4 h-4" /> Add content
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((c) => {
                const subject = data.subjects.find((s) => s.id === c.subjectId);
                return (
                  <Link
                    key={c.id}
                    to="/chunk/$chunkId"
                    params={{ chunkId: c.id }}
                    className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow group"
                  >
                    <div className="text-xs text-primary font-medium uppercase tracking-wide">{subject?.name}</div>
                    <div className="font-semibold mt-1 group-hover:text-primary transition-colors">{c.title}</div>
                    <div className="text-sm text-muted-foreground mt-2 line-clamp-3">{c.summary}</div>
                    <div className="text-xs text-muted-foreground mt-3 flex gap-3">
                      <span>{c.keyPoints.length} key points</span>
                      <span>{c.quiz.length} quiz</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-4">Install App</h2>
          <PwaInstallCard />
        </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
