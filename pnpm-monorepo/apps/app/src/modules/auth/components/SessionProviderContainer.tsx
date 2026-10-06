"use client";

import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { AdminModeContext } from "../hooks/AdminModeContext";

interface Props {
  readonly children?: ReactNode;
  readonly session: Session;
  /** The result of `isAdminModeActive` for this session */
  readonly adminModeActive: boolean;
}

export const SessionProviderContainer = ({
  children,
  session,
  adminModeActive,
}: Props) => {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <AdminModeContext value={adminModeActive}>{children}</AdminModeContext>
    </SessionProvider>
  );
};
