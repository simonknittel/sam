"use client";

import type { Role, Upload } from "@prisma/client";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

interface RolesContext {
  readonly roles: (Role & {
    icon: Upload | null;
    thumbnail: Upload | null;
  })[];
}

const RolesContext = createContext<RolesContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly roles: (Role & {
    icon: Upload | null;
    thumbnail: Upload | null;
  })[];
}

export const RolesContextProvider = ({ children, roles }: Props) => {
  const value = useMemo(
    () => ({
      roles,
    }),
    [roles],
  );

  return (
    <RolesContext.Provider value={value}>{children}</RolesContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useRolesContext() {
  const context = useContext(RolesContext);
  if (!context) throw new Error("Provider is missing.");
  return context;
}
