import { useEffect, useState } from "react";
import { Sidebar, SidebarInner } from "./Sidebar";
import { AddContentDialog } from "./AddContentDialog";
import { Search, LogOut, Loader2, Menu, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-xs sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarInner
            onAdd={() => setOpen(true)}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/70 backdrop-blur sticky top-0 z-10 flex items-center px-3 md:px-6 gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
            }}
            className="flex-1 max-w-xl relative min-w-0"
          >
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-9 bg-background"
            />
          </form>
          <div className="flex items-center gap-1 md:gap-2 text-sm text-muted-foreground shrink-0">
            <span className="hidden md:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/auth" }))} className="gap-1.5 px-2 md:px-3">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <AddContentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}