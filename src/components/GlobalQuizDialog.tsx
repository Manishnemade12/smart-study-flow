import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Quiz } from "@/components/Quiz";
import type { QuizQuestion } from "@/lib/types";

type Step = "config" | "loading" | "play";

export function GlobalQuizDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const data = useStore();
  const [step, setStep] = useState<Step>("config");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const subjectChunks = useMemo(
    () => (subjectId ? data.chunks.filter((c) => c.subjectId === subjectId) : []),
    [data.chunks, subjectId],
  );

  function reset() {
    setStep("config");
    setSubjectId(undefined);
    setSelectedChunkIds(new Set());
    setCount(10);
    setDifficulty("medium");
    setQuestions([]);
  }

  function toggleChunk(id: string) {
    setSelectedChunkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelectedChunkIds(new Set(subjectChunks.map((c) => c.id)));
  }
  function clearAll() {
    setSelectedChunkIds(new Set());
  }

  async function generate() {
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    const chunks = selectedChunkIds.size > 0
      ? subjectChunks.filter((c) => selectedChunkIds.has(c.id))
      : subjectChunks;
    if (!chunks.length) {
      toast.error("This subject has no chunks yet");
      return;
    }
    const notes = chunks
      .map((c) => `# ${c.title}\n\n${c.summary}\n\n${c.notes}`)
      .join("\n\n---\n\n");

    setStep("loading");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ notes, count, difficulty }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate quiz");
      }
      const out = await res.json();
      const qs: QuizQuestion[] = (out.questions ?? []).map((q: any, i: number) => ({
        id: `gen-${i}`,
        question: q.question,
        type: "mcq",
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      }));
      if (!qs.length) throw new Error("AI returned no questions");
      setQuestions(qs);
      setStep("play");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      setStep("config");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === "play" ? "Global quiz" : "Generate global quiz"}
          </DialogTitle>
          <DialogDescription>
            {step === "config" && "Pick a subject, choose chunks (or use all), and set your quiz size and difficulty."}
            {step === "loading" && "Generating questions from your notes…"}
            {step === "play" && `${questions.length} MCQs · ${difficulty} difficulty`}
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <Label className="text-xs">Subject</Label>
              <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setSelectedChunkIds(new Set()); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose subject…" /></SelectTrigger>
                <SelectContent>
                  {data.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subjectId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Chunks ({selectedChunkIds.size || "all"} selected)</Label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="text-primary hover:underline" onClick={selectAll}>Select all</button>
                    <button type="button" className="text-muted-foreground hover:underline" onClick={clearAll}>Clear</button>
                  </div>
                </div>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {subjectChunks.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2">No chunks in this subject.</div>
                  ) : (
                    <div className="space-y-1">
                      {subjectChunks.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/40 cursor-pointer">
                          <Checkbox
                            checked={selectedChunkIds.has(c.id)}
                            onCheckedChange={() => toggleChunk(c.id)}
                          />
                          <span className="text-sm">{c.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="text-xs text-muted-foreground">Tip: leave empty to quiz on the whole subject.</div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Number of questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={generate} className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="w-4 h-4" /> Generate quiz
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Building {count} {difficulty} MCQs…</div>
          </div>
        )}

        {step === "play" && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <Quiz questions={questions} />
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep("config")} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> New quiz
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}