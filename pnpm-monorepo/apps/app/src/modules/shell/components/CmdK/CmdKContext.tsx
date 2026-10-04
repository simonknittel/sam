"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface CmdKContext {
  readonly open: boolean;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly search: string;
  readonly setSearch: Dispatch<SetStateAction<string>>;
  readonly pages: string[];
  readonly setPages: Dispatch<SetStateAction<string[]>>;
  readonly canReadCareer?: Props["canReadCareer"];
}

const CmdKContext = createContext<CmdKContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  /**
   * Whether the viewer may read at least one career flow. Resolved on the
   * server because per-flow access lives in a table, not in the session's
   * permission sets.
   */
  readonly canReadCareer?: boolean;
}

export const CmdKProvider = ({ children, canReadCareer }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<string[]>([]);

  /**
   * Ctrl+K and Cmd+K on all platforms. With `useKey`, the K of the keyboard
   * layout starts the shortcut, and the physical K key also starts it. The
   * shortcut also works in form fields and in the wiki editor. Thus it also
   * closes the menu from its own search field.
   *
   * The shortcut does not open the menu behind a native modal dialog (a
   * confirmation, the tour): the menu then blocks the pointer events of the
   * page, and the buttons of the dialog do not get clicks.
   */
  useHotkeys(["ctrl+k", "meta+k"], () => setOpen((isOpen) => !isOpen), {
    useKey: true,
    preventDefault: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
    enabled: () => !document.querySelector("dialog:modal"),
  });

  const value = useMemo(
    () => ({
      open,
      setOpen,
      search,
      setSearch,
      pages,
      setPages,
      canReadCareer,
    }),
    [open, setOpen, search, setSearch, pages, setPages, canReadCareer],
  );

  return <CmdKContext value={value}>{children}</CmdKContext>;
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
