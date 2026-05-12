import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, BookOpen, Plus, Trash2, Zap, Settings } from "lucide-react";
import { useStore, useStoreActions } from "@/lib/store";
import { useAddContent } from "@/lib/add-content";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";

function InstallButtonCompact() {
  const { deferredPrompt, install, installed, ios } = usePwaInstall();

  if (installed) return <div className="text-xs text-muted-foreground">Installed</div>;
  if (ios) return null;
  if (!deferredPrompt) return null;

  return (
    <Button size="sm" onClick={() => install()} className="gap-2">
      <Download className="w-4 h-4" /> Install
    </Button>
  );
}

export function Sidebar({ onAdd }: { onAdd: () => void }) {
  return (
    <aside className="hidden md:flex w-72 shrink-0 border-r bg-card/50 backdrop-blur flex-col h-screen sticky top-0">
      <SidebarInner onAdd={onAdd} />
    </aside>
  );
}

export function SidebarInner({ onAdd, onNavigate }: { onAdd: () => void; onNavigate?: () => void }) {
  const data = useStore();
  const actions = useStoreActions();
  const openAdd = useAddContent();
  const params = useParams({ strict: false }) as { chunkId?: string };
  const activeId = params.chunkId;
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [openChunks, setOpenChunks] = useState<Record<string, boolean>>({});

  const handleAddSubject = async () => {
    const name = prompt("Enter new subject name");
    if (!name) return;
    try {
      await actions.createSubject(name.trim());
    } catch (err) {
      console.error(err);
      alert("Failed to create subject");
    }
  };

  const tree = useMemo(() => {
    return data.subjects.map((s) => ({
      subject: s,
      roots: data.chunks
        .filter((c) => c.subjectId === s.id && !c.parentChunkId)
        .sort((a, b) => a.order - b.order)
        .map((root) => ({
          chunk: root,
          children: data.chunks
            .filter((c) => c.parentChunkId === root.id)
            .sort((a, b) => a.order - b.order),
        })),
    }));
  }, [data]);

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="p-4 border-b flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <div className="font-semibold leading-tight">SSC Smart Notes</div>
          <div className="text-xs text-muted-foreground">AI study organizer</div>
        </div>
        <div className="ml-auto">
          <InstallButtonCompact />
        </div>
      </div>
      <div className="p-3 space-y-2 border-b">
        <Button onClick={() => { onAdd(); onNavigate?.(); }} className="w-full gap-2" style={{ background: "var(--gradient-primary)" }}>
          <Plus className="w-4 h-4" /> Add content
        </Button>
        <Button onClick={handleAddSubject} variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add subject
        </Button>
        
        {/* Daily Quiz Section */}
        <div className="pt-2 space-y-1">
          <Link
            to="/daily-quiz"
            onClick={() => onNavigate?.()}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium text-left hover:bg-accent/50 transition-colors"
          >
            <Zap className="w-4 h-4 text-yellow-500" /> Daily Quizzes
          </Link>
          <Link
            to="/daily-quiz-settings"
            onClick={() => onNavigate?.()}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left hover:bg-accent/50 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" /> Quiz Settings
          </Link>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {tree.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
            No subjects yet. Paste a ChatGPT conversation to get started.
          </div>
        )}
        {tree.map(({ subject, roots }) => {
          const open = openSubjects[subject.id] ?? true;
          return (
            <div key={subject.id}>
              <button
                onClick={() => setOpenSubjects((s) => ({ ...s, [subject.id]: !open }))}
                className="w-full flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-accent/50 group"
              >
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-medium text-sm flex-1 text-left">{subject.name}</span>
                <span className="text-xs text-muted-foreground">{roots.length}</span>
                <Plus
                  className="w-4 h-4 text-muted-foreground opacity-60 md:opacity-0 group-hover:opacity-100 hover:text-primary ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAdd({ subjectId: subject.id });
                    onNavigate?.();
                  }}
                />
                <Trash2
                  className="w-4 h-4 text-muted-foreground opacity-60 md:opacity-0 group-hover:opacity-100 hover:text-destructive ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete subject "${subject.name}" and all its chunks?`)) {
                      actions.deleteSubject(subject.id);
                    }
                  }}
                />
              </button>
              {open && (
                <div className="ml-4 border-l pl-2 space-y-0.5 mt-0.5">
                  {roots.map(({ chunk, children }) => {
                    const chunkOpen = openChunks[chunk.id] ?? true;
                    return (
                      <div key={chunk.id}>
                        <div className="flex items-center gap-0.5">
                          {children.length > 0 ? (
                            <button
                              onClick={() => setOpenChunks((s) => ({ ...s, [chunk.id]: !chunkOpen }))}
                              className="p-0.5 rounded hover:bg-accent/50"
                            >
                              {chunkOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                          ) : (
                            <span className="w-4" />
                          )}
                          <Link
                            to="/chunk/$chunkId"
                            params={{ chunkId: chunk.id }}
                            onClick={() => onNavigate?.()}
                            className={cn(
                              "flex-1 px-2 py-2 rounded-md text-sm truncate hover:bg-accent/50 transition-colors",
                              activeId === chunk.id && "bg-accent text-accent-foreground font-medium",
                            )}
                          >
                            {chunk.title}
                            {chunk.revised && <span className="ml-1 text-emerald-500">✓</span>}
                          </Link>
                        </div>
                        {chunkOpen && children.length > 0 && (
                          <div className="ml-4 border-l pl-2 space-y-0.5">
                            {children.map((child) => (
                              <Link
                                key={child.id}
                                to="/chunk/$chunkId"
                                params={{ chunkId: child.id }}
                                onClick={() => onNavigate?.()}
                                className={cn(
                                  "block px-2 py-2 rounded-md text-xs truncate hover:bg-accent/50 transition-colors text-muted-foreground",
                                  activeId === child.id && "bg-accent text-accent-foreground font-medium",
                                )}
                              >
                                {child.title}
                                {child.revised && <span className="ml-1 text-emerald-500">✓</span>}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}