"use client";

import type { BadgeRole, BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface RolesContext {
  readonly roles: readonly BadgeRole[];
  /** Sorted by name */
  readonly tags: readonly BadgeRoleTag[];
  /** The tags of each visible role, sorted by name */
  readonly tagsByRoleId: ReadonlyMap<BadgeRole["id"], readonly BadgeRoleTag[]>;
}

const RolesContext = createContext<RolesContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly roles: readonly BadgeRole[];
  /** The tags that the viewer can see, sorted by name */
  readonly tags: readonly BadgeRoleTag[];
}

export const RolesContextProvider = ({ children, roles, tags }: Props) => {
  const tagsByRoleId = new Map<BadgeRole["id"], BadgeRoleTag[]>();
  for (const tag of tags) {
    for (const roleId of tag.roleIds) {
      const roleTags = tagsByRoleId.get(roleId);
      if (roleTags) {
        roleTags.push(tag);
      } else {
        tagsByRoleId.set(roleId, [tag]);
      }
    }
  }

  const value = {
    roles,
    tags,
    tagsByRoleId,
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
