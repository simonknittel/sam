"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface WikiEditModeContext {
  /** Whether the viewer has toggled the page into edit mode */
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
 * Client state for the edit-mode toggle of a wiki page. Every page visit
 * starts in view mode (mount with key={pageId} so navigating resets the
 * state); the toggle button in the page header switches the content editor
 * between the read-only and the editable rendering.
 */
export const WikiEditModeProvider = ({ children }: Props) => {
  const [isEditMode, setEditMode] = useState(false);

  const value = useMemo(() => ({ isEditMode, setEditMode }), [isEditMode]);

  return (
    <WikiEditModeContext.Provider value={value}>
      {children}
    </WikiEditModeContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export const useWikiEditMode = () => {
  const context = useContext(WikiEditModeContext);
  if (!context) throw new Error("[WikiEditModeContext] Provider is missing!");
  return context;
};
