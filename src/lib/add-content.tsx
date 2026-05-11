import { createContext, useContext, useState, ReactNode } from "react";
import { AddContentDialog } from "@/components/AddContentDialog";

export type AddTarget = { subjectId?: string; parentChunkId?: string };

const Ctx = createContext<(t?: AddTarget) => void>(() => {});

export function AddContentProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<AddTarget | undefined>(undefined);
  return (
    <Ctx.Provider
      value={(t) => {
        setTarget(t);
        setOpen(true);
      }}
    >
      {children}
      <AddContentDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTarget(undefined);
        }}
        initialTarget={target}
      />
    </Ctx.Provider>
  );
}

export const useAddContent = () => useContext(Ctx);
