import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AddContentDialog } from "./AddContentDialog";
import { Search, LogOut, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--gradient-subtle)" }}>
      <Sidebar onAdd={() => setOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/60 backdrop-blur sticky top-0 z-10 flex items-center px-6 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
            }}
            className="flex-1 max-w-xl relative"
          >
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes, topics, questions…"
              className="pl-9 bg-background"
            />
          </form>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden md:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/auth" }))} className="gap-1.5">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <AddContentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}