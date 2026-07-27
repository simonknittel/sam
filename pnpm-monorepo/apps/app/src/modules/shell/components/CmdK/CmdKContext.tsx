"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface CmdKContext {
  readonly open: boolean;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly search: string;
  readonly setSearch: Dispatch<SetStateAction<string>>;
  readonly pages: string[];
  readonly setPages: Dispatch<SetStateAction<string[]>>;
  readonly disableAlgolia?: Props["disableAlgolia"];
}

const CmdKContext = createContext<CmdKContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly disableAlgolia?: boolean;
}

export const CmdKProvider = ({ children, disableAlgolia }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      search,
      setSearch,
      pages,
      setPages,
      disableAlgolia,
    }),
    [open, setOpen, search, setSearch, pages, setPages, disableAlgolia],
  );

  return <CmdKContext.Provider value={value}>{children}</CmdKContext.Provider>;
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useCmdKContext() {
  const context = useContext(CmdKContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
