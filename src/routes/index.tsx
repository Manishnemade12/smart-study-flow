import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSC Smart Notes — Smart study flow for SSC" },
      {
        name: "description",
        content:
          "Turn long ChatGPT conversations into organized SSC notes, quizzes, and revision chunks.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-10 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI study organizer for SSC preparation
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                Turn long chats into clean, revision-ready study notes.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                SSC Smart Notes helps you paste ChatGPT conversations, organize them into subjects and chunks, and revise faster with key points and quizzes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Button asChild size="lg" className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                  <Link to="/dashboard">
                    Open dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gap-2" style={{ background: "var(--gradient-primary)" }}>
                  <Link to="/auth">
                    Get started <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <a href="#features">See features</a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FeaturePill icon={<BookOpen className="h-4 w-4" />} title="Organized notes" text="Subjects, chapters, and chunks" />
              <FeaturePill icon={<Layers3 className="h-4 w-4" />} title="Smart revision" text="Key points and quiz questions" />
              <FeaturePill icon={<ShieldCheck className="h-4 w-4" />} title="Saved across devices" text="Sign in to keep everything synced" />
            </div>

            {!loading && user && (
              <p className="text-sm text-primary font-medium">
                You are already signed in. Continue to the dashboard.
              </p>
            )}
          </section>

          <section id="features" className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
                <h2 className="mt-2 text-2xl font-semibold">Simple flow, no clutter.</h2>
              </div>

              <div className="space-y-3">
                <StepCard
                  number="01"
                  title="Sign in"
                  text="Create an account or log in to keep your study data safe."
                />
                <StepCard
                  number="02"
                  title="Paste content"
                  text="Add long ChatGPT conversations and convert them into structured notes."
                />
                <StepCard
                  number="03"
                  title="Revise faster"
                  text="Use summaries, important terms, and quizzes from your dashboard."
                />
              </div>

              <div className="rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 p-4 text-sm text-muted-foreground">
                Best for SSC exam preparation, quick revision, and staying organized while studying.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function FeaturePill({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4">
      <div className="text-xs font-semibold tracking-[0.18em] text-primary">{number}</div>
      <div className="mt-1 font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}
