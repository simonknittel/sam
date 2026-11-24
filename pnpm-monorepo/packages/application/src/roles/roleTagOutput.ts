import type { Prisma } from "@sam-monorepo/database/client";
import { getPublicUploadUrl, type ApplicationContext } from "../context.js";
import type { RoleTagBadge } from "./roleTagBadges.js";
import { compareRoleNames } from "./roleVisibility.js";

export interface RoleTagOutput {
  readonly id: string;
  readonly name: string;
  /** Plain text */
  readonly description: string | null;
  readonly icon_url: string | null;
  /** Only the roles that the actor can see */
  readonly role_ids: string[];
}

export interface RoleTagReference {
  readonly id: string;
  readonly name: string;
}

/**
 * A user who sees the role also sees its tags (see
 * `findVisibleRoleTagBadges()`), thus the outputs give all of them
 */
export const ROLE_TAG_REFERENCES_SELECT = {
  select: { tag: { select: { id: true, name: true } } },
} as const satisfies Prisma.Role$tagsArgs;

export const toRoleTagReferences = (
  assignments: readonly { readonly tag: RoleTagReference }[],
): RoleTagReference[] =>
  assignments
    .map(({ tag }) => ({ id: tag.id, name: tag.name }))
    .toSorted(compareRoleNames);

export const toRoleTagOutput = (
  context: Pick<ApplicationContext, "urls">,
  tag: RoleTagBadge,
): RoleTagOutput => ({
  id: tag.id,
  name: tag.name,
  description: tag.description,
  icon_url: tag.icon ? getPublicUploadUrl(context.urls, tag.icon.id) : null,
  role_ids: tag.roleIds,
});
