"use client";

import type { BadgeRole, BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface RolesContext {
  readonly roles: readonly BadgeRole[];
  readonly tags: readonly BadgeRoleTag[];
  /** The ids of the tags of each visible role */
  readonly tagIdsByRoleId: ReadonlyMap<
    BadgeRole["id"],
    readonly BadgeRoleTag["id"][]
  >;
}

const RolesContext = createContext<RolesContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly roles: readonly BadgeRole[];
  /** The tags of the visible roles */
  readonly tags?: readonly BadgeRoleTag[];
}

export const RolesContextProvider = ({ children, roles, tags = [] }: Props) => {
  const tagIdsByRoleId = new Map<BadgeRole["id"], BadgeRoleTag["id"][]>();
  for (const tag of tags) {
    for (const roleId of tag.roleIds) {
      const tagIds = tagIdsByRoleId.get(roleId);
      if (tagIds) {
        tagIds.push(tag.id);
      } else {
        tagIdsByRoleId.set(roleId, [tag.id]);
      }
    }
  }

  const value = {
    roles,
    tags,
    tagIdsByRoleId,
  };

  return <RolesContext value={value}>{children}</RolesContext>;
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
