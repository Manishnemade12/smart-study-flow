import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSubjectId?: string;
  defaultChunkIds?: string[];
};

export function QuizGenerateDialog({ open, onOpenChange, defaultSubjectId, defaultChunkIds }: Props) {
  const data = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjectId, setSubjectId] = useState<string | undefined>(defaultSubjectId);
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(new Set(defaultChunkIds ?? []));
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [timer, setTimer] = useState(10);
  const [randomize, setRandomize] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSubjectId(defaultSubjectId);
      setSelectedChunkIds(new Set(defaultChunkIds ?? []));
      setCount(10);
      setDifficulty("medium");
      setTimer(10);
      setRandomize(true);
    }
  }, [open, defaultSubjectId, defaultChunkIds]);

  const subjectChunks = useMemo(
    () => (subjectId ? data.chunks.filter((c) => c.subjectId === subjectId) : []),
    [data.chunks, subjectId],
  );

  const subject = data.subjects.find((s) => s.id === subjectId);

  function toggleChunk(id: string) {
    setSelectedChunkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (!user) { toast.error("Please sign in"); return; }
    if (!subjectId || !subject) { toast.error("Pick a subject"); return; }

    const chunks = selectedChunkIds.size > 0
      ? subjectChunks.filter((c) => selectedChunkIds.has(c.id))
      : subjectChunks;

    const notes = chunks
      .map((c) => `# ${c.title}\n\n${c.summary}\n\n${c.notes}`)
      .join("\n\n---\n\n");

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ notes, topic: subject.name, count, difficulty }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate quiz");
      }
      const out = await res.json();
      let questions = out.questions ?? [];
      if (!questions.length) throw new Error("AI returned no questions");
      if (randomize) questions = [...questions].sort(() => Math.random() - 0.5);

      const today = new Date().toISOString().split("T")[0];
      const { data: inserted, error } = await supabase
        .from("daily_quizzes")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          quiz_date: today,
          questions,
          total_questions: questions.length,
          difficulty,
          source: "ai",
        })
        .select("id")
        .single();

      if (error) throw error;

      onOpenChange(false);
      navigate({
        to: "/daily-quiz/$subjectId",
        params: { subjectId },
        search: { quizId: inserted.id, timer },
      });
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate SSC Quiz
          </DialogTitle>
          <DialogDescription>
            SSC-style MCQs. Pick subject (and optional chunks), then size, difficulty, and timer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
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

          {subjectId && subjectChunks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Chunks ({selectedChunkIds.size || "all"} selected)</Label>
                <div className="flex gap-2 text-xs">
                  <button type="button" className="text-primary hover:underline"
                    onClick={() => setSelectedChunkIds(new Set(subjectChunks.map(c => c.id)))}>Select all</button>
                  <button type="button" className="text-muted-foreground hover:underline"
                    onClick={() => setSelectedChunkIds(new Set())}>Clear</button>
                </div>
              </div>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {subjectChunks.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/40 cursor-pointer">
                      <Checkbox checked={selectedChunkIds.has(c.id)} onCheckedChange={() => toggleChunk(c.id)} />
                      <span className="text-sm">{c.title}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <div className="text-xs text-muted-foreground">Leave empty to quiz on the whole subject.</div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Questions</Label>
              <Input type="number" min={5} max={50} value={count}
                onChange={(e) => setCount(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                className="mt-1" />
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
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs flex items-center gap-1"><Timer className="w-3 h-3" /> Timer (min)</Label>
              <Input type="number" min={1} max={180} value={timer}
                onChange={(e) => setTimer(Math.max(1, Math.min(180, parseInt(e.target.value) || 10)))}
                className="mt-1" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={randomize} onCheckedChange={(v) => setRandomize(!!v)} />
            Randomize question order
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={generate} className="gap-2" disabled={loading || !subjectId}
            style={{ background: "var(--gradient-primary)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating…" : "Generate & Start"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
