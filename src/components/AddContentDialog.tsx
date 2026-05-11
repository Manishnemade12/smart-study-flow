import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ArrowLeft, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStore, useStoreActions } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Step = "input" | "loading" | "preview";
type Mode = "auto" | "subject" | "chunk";

interface PreviewTree {
  subjects: Array<{
    name: string;
    description?: string;
    chunks: Array<{
      title: string;
      summary: string;
      notes: string;
      keyPoints: string[];
      terms: { term: string; meaning: string }[];
      quiz: any[];
      children?: any[];
    }>;
  }>;
}

export interface AddTarget {
  subjectId?: string;
  parentChunkId?: string;
}

export function AddContentDialog({
  open,
  onOpenChange,
  initialTarget,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTarget?: AddTarget;
}) {
  const data = useStore();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [tree, setTree] = useState<PreviewTree | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [parentChunkId, setParentChunkId] = useState<string | undefined>();
  const navigate = useNavigate();
  const actions = useStoreActions();

  // Sync incoming target whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    if (initialTarget?.parentChunkId) {
      setMode("chunk");
      setParentChunkId(initialTarget.parentChunkId);
      const ch = data.chunks.find((c) => c.id === initialTarget.parentChunkId);
      setSubjectId(ch?.subjectId);
    } else if (initialTarget?.subjectId) {
      setMode("subject");
      setSubjectId(initialTarget.subjectId);
      setParentChunkId(undefined);
    } else {
      setMode("auto");
      setSubjectId(undefined);
      setParentChunkId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTarget?.subjectId, initialTarget?.parentChunkId]);

  const subjectOptions = data.subjects;
  const chunkOptions = subjectId
    ? data.chunks.filter((c) => c.subjectId === subjectId)
    : data.chunks;

  function reset() {
    setStep("input");
    setText("");
    setTree(null);
  }

  async function organize() {
    if (text.trim().length < 30) {
      toast.error("Paste at least a paragraph of content.");
      return;
    }
    if (mode === "subject" && !subjectId) {
      toast.error("Choose a subject to add to.");
      return;
    }
    if (mode === "chunk" && !parentChunkId) {
      toast.error("Choose a chunk to add sub-topics under.");
      return;
    }
    setStep("loading");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chunk-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ content: text }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to organize content");
      }
      const out = (await res.json()) as PreviewTree;
      if (!out.subjects?.length) throw new Error("No subjects detected");
      setTree(out);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      setStep("input");
    }
  }

  async function save() {
    if (!tree) return;
    setSaving(true);
    try {
      const target =
        mode === "chunk"
          ? { parentChunkId }
          : mode === "subject"
          ? { subjectId }
          : undefined;
      await actions.importTree(tree, target);
      const totalChunks = tree.subjects.reduce((n, s) => n + s.chunks.length, 0);
      toast.success(
        mode === "auto"
          ? `Saved ${tree.subjects.length} subject(s)`
          : `Added ${totalChunks} chunk(s)`,
      );
      const firstTitle = tree.subjects[0]?.chunks[0]?.title;
      onOpenChange(false);
      reset();
      if (firstTitle) {
        const { data: row } = await supabase
          .from("chunks")
          .select("id")
          .eq("title", firstTitle)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (row?.id) navigate({ to: "/chunk/$chunkId", params: { chunkId: row.id } });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const targetSubject = subjectId ? data.subjects.find((s) => s.id === subjectId) : null;
  const targetChunk = parentChunkId ? data.chunks.find((c) => c.id === parentChunkId) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === "preview" ? "Review detected structure" : "Add study content"}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Paste a ChatGPT conversation or notes. Choose where it should go — a brand new structure, an existing subject, or as sub-topics under a chunk."}
            {step === "loading" && "Analyzing content and detecting topics…"}
            {step === "preview" && (
              mode === "chunk" && targetChunk
                ? `Will be added as sub-topics under "${targetChunk.title}".`
                : mode === "subject" && targetSubject
                ? `Will be added under subject "${targetSubject.name}".`
                : "Review the organized structure before saving."
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div>
                <Label className="text-xs font-medium">Where should this go?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <ModeBtn active={mode === "auto"} onClick={() => setMode("auto")} title="New / auto" desc="Create or merge subjects" />
                  <ModeBtn active={mode === "subject"} onClick={() => setMode("subject")} disabled={!subjectOptions.length} title="Existing subject" desc="Append new chunks" />
                  <ModeBtn active={mode === "chunk"} onClick={() => setMode("chunk")} disabled={!data.chunks.length} title="Under a chunk" desc="Add as sub-topics" />
                </div>
              </div>

              {mode === "subject" && (
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose subject…" /></SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "chunk" && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Subject (filter)</Label>
                    <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setParentChunkId(undefined); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="All subjects" /></SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Parent chunk</Label>
                    <Select value={parentChunkId} onValueChange={setParentChunkId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Choose chunk…" /></SelectTrigger>
                      <SelectContent>
                        {chunkOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your ChatGPT conversation or syllabus here…"
              className="min-h-[260px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={organize} className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="w-4 h-4" /> Organize with AI
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Detecting topics and quiz questions…</div>
          </div>
        )}

        {step === "preview" && tree && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {tree.subjects.map((s, i) => (
              <div key={i} className="rounded-lg border p-4 bg-card">
                <div className="font-semibold text-base">
                  {mode === "auto" ? s.name : (mode === "subject" ? targetSubject?.name : targetChunk?.title)}
                  {mode !== "auto" && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ← {mode === "chunk" ? "adding as sub-topics" : `merging "${s.name}"`}
                    </span>
                  )}
                </div>
                <ul className="mt-2 space-y-1">
                  {s.chunks.map((c, j) => (
                    <li key={j} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="font-medium">{c.title}</span>
                        <span className="text-xs text-muted-foreground">· {c.quiz?.length ?? 0} quiz</span>
                      </div>
                      {c.children && c.children.length > 0 && mode !== "chunk" && (
                        <ul className="ml-5 mt-0.5 space-y-0.5">
                          {c.children.map((ch: any, k: number) => (
                            <li key={k} className="text-xs text-muted-foreground">— {ch.title}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex justify-between gap-2 sticky bottom-0 bg-background pt-2">
              <Button variant="outline" onClick={() => setStep("input")} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={save} disabled={saving} className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Saving…" : "Save to library"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeBtn({ active, onClick, disabled, title, desc }: { active: boolean; onClick: () => void; disabled?: boolean; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "text-left rounded-md border px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
        (active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent/40")
      }
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
