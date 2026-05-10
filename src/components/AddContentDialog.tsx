import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useStoreActions } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Step = "input" | "loading" | "preview";

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

export function AddContentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [tree, setTree] = useState<PreviewTree | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const actions = useStoreActions();

  async function organize() {
    if (text.trim().length < 30) {
      toast.error("Paste at least a paragraph of content.");
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
      const data = (await res.json()) as PreviewTree;
      if (!data.subjects?.length) throw new Error("No subjects detected");
      setTree(data);
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
      await actions.importTree(tree);
      toast.success(`Saved ${tree.subjects.length} subject(s)`);
      const firstTitle = tree.subjects[0]?.chunks[0]?.title;
      onOpenChange(false);
      setStep("input");
      setText("");
      setTree(null);
      // Find newly inserted chunk by title to navigate
      if (firstTitle) {
        const { data } = await supabase
          .from("chunks")
          .select("id")
          .eq("title", firstTitle)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.id) navigate({ to: "/chunk/$chunkId", params: { chunkId: data.id } });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setStep("input"); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === "preview" ? "Review detected structure" : "Add study content"}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Paste a long ChatGPT conversation or syllabus text. AI will organize it into chunks."}
            {step === "loading" && "Analyzing content and detecting topics…"}
            {step === "preview" && "Review the organized structure before saving."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your full ChatGPT conversation or syllabus here…"
              className="min-h-[320px] font-mono text-sm"
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
            <div className="text-sm text-muted-foreground">Detecting subjects, chapters and quiz questions…</div>
            <div className="w-full max-w-md space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${100 - i * 10}%` }} />
              ))}
            </div>
          </div>
        )}

        {step === "preview" && tree && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {tree.subjects.map((s, i) => (
              <div key={i} className="rounded-lg border p-4 bg-card">
                <div className="font-semibold text-base">{s.name}</div>
                {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                <ul className="mt-2 space-y-1">
                  {s.chunks.map((c, j) => (
                    <li key={j} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="font-medium">{c.title}</span>
                        <span className="text-xs text-muted-foreground">· {c.quiz?.length ?? 0} quiz</span>
                      </div>
                      {c.children && c.children.length > 0 && (
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