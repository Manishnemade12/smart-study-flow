import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { useStore, useStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Quiz } from "@/components/Quiz";
import { Pencil, Save, X, Trash2, CheckCircle2, Circle, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAddContent } from "@/lib/add-content";

export const Route = createFileRoute("/chunk/$chunkId")({
  component: ChunkPage,
});

function ChunkPage() {
  const { chunkId } = useParams({ from: "/chunk/$chunkId" });
  const data = useStore();
  const actions = useStoreActions();
  const navigate = useNavigate();
  const openAdd = useAddContent();
  const chunk = data.chunks.find((c) => c.id === chunkId);
  const subject = chunk ? data.subjects.find((s) => s.id === chunk.subjectId) : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", summary: "", notes: "" });

  const breadcrumb = useMemo(() => {
    if (!chunk) return [];
    const trail: string[] = [];
    let cur = chunk;
    while (cur) {
      trail.unshift(cur.title);
      const parent = data.chunks.find((c) => c.id === cur.parentChunkId);
      if (!parent) break;
      cur = parent;
    }
    return trail;
  }, [chunk, data]);

  if (!chunk || !subject) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">
          Chunk not found. <Link to="/dashboard" className="text-primary underline">Go home</Link>.
        </div>
      </AppLayout>
    );
  }

  function startEdit() {
    setDraft({ title: chunk!.title, summary: chunk!.summary, notes: chunk!.notes });
    setEditing(true);
  }
  async function saveEdit() {
    await actions.updateChunk(chunk!.id, { title: draft.title, summary: draft.summary, notes: draft.notes });
    setEditing(false);
    toast.success("Saved");
  }
  async function del() {
    if (!confirm(`Delete "${chunk!.title}"? This cannot be undone.`)) return;
    await actions.deleteChunk(chunk!.id);
    navigate({ to: "/dashboard" });
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 md:py-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Link to="/dashboard" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span>{subject.name}</span>
          {breadcrumb.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" />
              <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>{t}</span>
            </span>
          ))}
        </nav>

        <header className="mb-5 md:mb-6">
          {editing ? (
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="text-2xl font-bold h-auto py-2"
            />
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight wrap-break-word">{chunk.title}</h1>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button
              variant={chunk.revised ? "default" : "outline"}
              size="sm"
              onClick={() => actions.updateChunk(chunk.id, { revised: !chunk.revised })}
              className="gap-2"
            >
              {chunk.revised ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {chunk.revised ? "Revised" : "Mark as revised"}
            </Button>
            {editing ? (
              <>
                <Button size="sm" onClick={saveEdit} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-2"><X className="w-4 h-4" /> Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit} className="gap-2"><Pencil className="w-4 h-4" /> Edit</Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAdd({ parentChunkId: chunk.id })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add more notes
            </Button>
            <Button size="sm" variant="ghost" onClick={del} className="gap-2 text-destructive hover:text-destructive ml-auto">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </header>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="w-full md:w-auto overflow-x-auto">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="key">Key points</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="quiz">Quiz ({chunk.quiz.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-6 mt-6">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Summary</label>
                  <Textarea value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Notes (markdown)</label>
                  <Textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} className="mt-1 min-h-100 font-mono text-sm" />
                </div>
              </>
            ) : (
              <>
                {chunk.summary && (
                  <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed">
                    {chunk.summary}
                  </div>
                )}
                <article className="markdown-body">
                  <ReactMarkdown>{chunk.notes || "*No notes yet.*"}</ReactMarkdown>
                </article>
              </>
            )}
          </TabsContent>

          <TabsContent value="key" className="mt-6">
            {chunk.keyPoints.length === 0 ? (
              <div className="text-sm text-muted-foreground">No key points.</div>
            ) : (
              <ul className="space-y-2">
                {chunk.keyPoints.map((kp, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border bg-card p-3">
                    <span className="text-primary font-semibold">{i + 1}.</span>
                    <span className="text-sm leading-relaxed">{kp}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            {chunk.terms.length === 0 ? (
              <div className="text-sm text-muted-foreground">No important terms.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {chunk.terms.map((t, i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <div className="font-semibold text-primary">{t.term}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t.meaning}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="mt-6">
            <Quiz questions={chunk.quiz} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}