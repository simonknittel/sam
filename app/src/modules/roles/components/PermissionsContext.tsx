"use client";

import { type PermissionString, type Role } from "@/generated/prisma/browser";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";

interface PermissionsContextInterface {
  register: (permissionString: string) => {
    name: string;
    defaultChecked: boolean;
  };
  permissionStrings: string[];
}

const PermissionsContext = createContext<
  PermissionsContextInterface | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly role: Role & {
    permissionStrings: PermissionString[];
  };
}

export const PermissionsProvider = ({ children, role }: Props) => {
  const permissionStrings = useMemo(
    () =>
      role.permissionStrings.map(
        (permissionString) => permissionString.permissionString,
      ),
    [role.permissionStrings],
  );

  const register = useCallback(
    (permissionString: string) => {
      return {
        name: permissionString,
        defaultChecked: permissionStrings.includes(permissionString),
      };
    },
    [permissionStrings],
  );

  const value = useMemo(
    () => ({
      register,
      permissionStrings,
    }),
    [register, permissionStrings],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
