import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { useAddContent } from "@/lib/add-content";
import { Sparkles, BookOpen, ListChecks, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaInstallCard } from "@/components/PwaInstallCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — SSC Smart Notes" }],
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:space-y-10 md:px-8 md:py-10">
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-primary-foreground md:p-8"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered study organizer
          </div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
            Turn long ChatGPT chats into perfectly organized SSC notes.
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/85 md:text-base">
            Paste any conversation. We detect subjects, chapters, key terms and quiz questions instantly.
          </p>
          <Button onClick={() => openAdd()} variant="secondary" className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Add new content
          </Button>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Subjects" value={stats.subjects} />
        <StatCard icon={<ListChecks className="h-4 w-4" />} label="Chunks" value={stats.total} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Revised" value={`${stats.revised}/${stats.total || 0}`} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Quiz questions" value={stats.totalQuiz} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recently updated</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-medium">No notes yet</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">Paste your first ChatGPT conversation to get started.</p>
            <Button onClick={() => openAdd()} className="gap-2" style={{ background: "var(--gradient-primary)" }}>
              <Plus className="h-4 w-4" /> Add content
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((c) => {
              const subject = data.subjects.find((s) => s.id === c.subjectId);
              return (
                <Link
                  key={c.id}
                  to="/chunk/$chunkId"
                  params={{ chunkId: c.id }}
                  className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">{subject?.name}</div>
                  <div className="mt-1 font-semibold transition-colors group-hover:text-primary">{c.title}</div>
                  <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.summary}</div>
                  <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
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
        <h2 className="mb-4 mt-6 text-lg font-semibold">Install App</h2>
        <PwaInstallCard />
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}