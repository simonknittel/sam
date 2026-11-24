"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WikiEditModeContext {
  readonly isEditMode: boolean;
  readonly setEditMode: (isEditMode: boolean) => void;
}

const WikiEditModeContext = createContext<WikiEditModeContext | undefined>(
  undefined,
);

interface Props {
  readonly children: ReactNode;
}

/**
 * Every page visit starts in view mode: mount with key={pageId} so navigating
 * resets the state.
 */
export const WikiEditModeProvider = ({ children }: Props) => {
  const [isEditMode, setEditMode] = useState(false);

  const value = { isEditMode, setEditMode };

  return <WikiEditModeContext value={value}>{children}</WikiEditModeContext>;
};

export const useWikiEditMode = () => {
  const context = useContext(WikiEditModeContext);
  if (!context) throw new Error("[WikiEditModeContext] Provider is missing!");
  return context;
};
