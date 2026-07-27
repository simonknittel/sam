"use client";

import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";

interface Props {
  readonly children?: ReactNode;
  readonly session: Session;
}

export const SessionProviderContainer = ({ children, session }: Props) => {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
};
