import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Search as SearchIcon } from "lucide-react";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => schema.parse(s),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const data = useStore();
  const query = q.toLowerCase();

  const results = data.chunks
    .map((c) => {
      const subject = data.subjects.find((s) => s.id === c.subjectId);
      const haystack = [
        c.title,
        c.summary,
        c.notes,
        ...c.keyPoints,
        ...c.terms.map((t) => `${t.term} ${t.meaning}`),
        ...c.quiz.map((q) => `${q.question} ${q.answer}`),
        subject?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query) ? { c, subject } : null;
    })
    .filter(Boolean) as Array<{ c: any; subject: any }>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Results for "{q}"</h1>
          <span className="text-sm text-muted-foreground ml-auto">{results.length} match{results.length === 1 ? "" : "es"}</span>
        </div>
        {results.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
            No results. Try different keywords.
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(({ c, subject }) => (
              <Link key={c.id} to="/chunk/$chunkId" params={{ chunkId: c.id }} className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="text-xs text-primary font-medium uppercase tracking-wide">{subject?.name}</div>
                <div className="font-semibold mt-1">{c.title}</div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.summary || c.notes.slice(0, 200)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}