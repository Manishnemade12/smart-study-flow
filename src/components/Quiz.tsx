import { useState } from "react";
import type { QuizQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);

  if (questions.length === 0) {
    return <div className="text-sm text-muted-foreground">No quiz questions for this chunk yet.</div>;
  }

  if (done) {
    const correct = questions.filter((q) => normalize(answers[q.id]) === normalize(q.answer)).length;
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <div className="text-3xl font-bold">{correct} / {questions.length}</div>
        <div className="text-muted-foreground">Quiz complete</div>
        <Button onClick={() => { setIdx(0); setAnswers({}); setRevealed({}); setDone(false); }} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" /> Retake
        </Button>
      </div>
    );
  }

  const q = questions[idx];
  const userAns = answers[q.id] ?? "";
  const isRevealed = revealed[q.id];
  const isCorrect = normalize(userAns) === normalize(q.answer);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {idx + 1} of {questions.length}</span>
        <span className="uppercase tracking-wide">{q.type.replace("_", " ")}</span>
      </div>
      <div className="text-lg font-medium leading-snug">{q.question}</div>

      {q.type === "mcq" && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt) => {
            const selected = userAns === opt;
            const correctOpt = isRevealed && normalize(opt) === normalize(q.answer);
            const wrongOpt = isRevealed && selected && !correctOpt;
            return (
              <button
                key={opt}
                onClick={() => !isRevealed && setAnswers((a) => ({ ...a, [q.id]: opt }))}
                disabled={isRevealed}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                  selected && !isRevealed && "border-primary bg-primary/5",
                  correctOpt && "border-emerald-500 bg-emerald-50",
                  wrongOpt && "border-destructive bg-destructive/5",
                  !selected && !isRevealed && "hover:bg-accent/50",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "true_false" && (
        <div className="flex gap-2">
          {["True", "False"].map((opt) => (
            <button
              key={opt}
              onClick={() => !isRevealed && setAnswers((a) => ({ ...a, [q.id]: opt }))}
              disabled={isRevealed}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border font-medium",
                userAns === opt && !isRevealed && "border-primary bg-primary/5",
                isRevealed && normalize(opt) === normalize(q.answer) && "border-emerald-500 bg-emerald-50",
                isRevealed && userAns === opt && normalize(opt) !== normalize(q.answer) && "border-destructive bg-destructive/5",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === "one_line" && (
        <Input
          value={userAns}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          placeholder="Type your answer…"
          disabled={isRevealed}
        />
      )}

      {isRevealed && (
        <div className={cn("rounded-lg p-3 text-sm border", isCorrect ? "border-emerald-500 bg-emerald-50" : "border-destructive bg-destructive/5")}>
          <div className="flex items-center gap-2 font-medium">
            {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
            {isCorrect ? "Correct" : `Answer: ${q.answer}`}
          </div>
          {q.explanation && <div className="mt-1 text-muted-foreground">{q.explanation}</div>}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>Previous</Button>
        {!isRevealed ? (
          <Button onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))} disabled={!userAns} style={{ background: "var(--gradient-primary)" }}>
            Check answer
          </Button>
        ) : idx < questions.length - 1 ? (
          <Button onClick={() => setIdx((i) => i + 1)} style={{ background: "var(--gradient-primary)" }}>Next</Button>
        ) : (
          <Button onClick={() => setDone(true)} style={{ background: "var(--gradient-primary)" }}>Finish</Button>
        )}
      </div>
    </div>
  );
}

function normalize(s: string | undefined) {
  return (s ?? "").trim().toLowerCase();
}