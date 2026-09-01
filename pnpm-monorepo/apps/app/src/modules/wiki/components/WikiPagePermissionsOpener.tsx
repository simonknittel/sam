"use client";

import { createContext, useContext, type ReactNode } from "react";

const WikiPagePermissionsOpenerContext = createContext<
  (() => void) | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly onOpen: () => void;
}

/**
 * Hands the opener of a permissions dialog to triggers outside the dialog's
 * own markup — the lock button in the action row and the visibility badge
 * in the metadata line. Both wiki models bring their own dialog and share
 * these two triggers.
 */
export const WikiPagePermissionsOpenerProvider = ({
  children,
  onOpen,
}: Props) => (
  <WikiPagePermissionsOpenerContext.Provider value={onOpen}>
    {children}
  </WikiPagePermissionsOpenerContext.Provider>
);

/**
 * Unlike the other wiki contexts this one must not throw when it is
 * missing: a dialog is only rendered for viewers who may change the
 * permissions, while the badge renders for every reader — without an
 * opener it stays plain text.
 */
export const useWikiPagePermissionsOpener = () =>
  useContext(WikiPagePermissionsOpenerContext);
