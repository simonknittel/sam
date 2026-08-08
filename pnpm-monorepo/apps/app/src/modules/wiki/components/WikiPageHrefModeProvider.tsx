"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  GLOBAL_WIKI_HREF_MODE,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";

/**
 * Defaults to the global wiki so its routes need no provider — only the
 * event wiki (briefing) layouts mount one.
 */
const WikiPageHrefModeContext = createContext<WikiPageHrefMode>(
  GLOBAL_WIKI_HREF_MODE,
);

interface Props {
  readonly mode: WikiPageHrefMode;
  readonly children: ReactNode;
}

export const WikiPageHrefModeProvider = ({ mode, children }: Props) => {
  return (
    <WikiPageHrefModeContext.Provider value={mode}>
      {children}
    </WikiPageHrefModeContext.Provider>
  );
};

export const useWikiPageHrefMode = () => useContext(WikiPageHrefModeContext);
