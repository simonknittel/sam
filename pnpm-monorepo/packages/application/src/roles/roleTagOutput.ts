import type { Prisma } from "@sam-monorepo/database/client";
import { getPublicUploadUrl, type ApplicationContext } from "../context.js";
import type { RoleTagBadge } from "./roleTagBadges.js";
import { compareRoleNames } from "./roleVisibility.js";

/** A tag in the list of the tags and after a write of a tag */
export interface RoleTagOutput {
  readonly id: string;
  readonly name: string;
  /** Plain text */
  readonly description: string | null;
  readonly icon_url: string | null;
  /** The roles of the tag that the actor can see, sorted by name */
  readonly role_ids: string[];
}

/** A tag in the outputs of a role */
export interface RoleTagReference {
  readonly id: string;
  readonly name: string;
}

/**
 * The tags of a role. A user who sees the role also sees its tags (see
 * `findVisibleRoleTagBadges()`), thus the outputs give all of them.
 */
export const ROLE_TAG_REFERENCES_SELECT = {
  select: { tag: { select: { id: true, name: true } } },
} as const satisfies Prisma.Role$tagsArgs;

/** The tags of a role, sorted by name like the tag row of the role picker */
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
