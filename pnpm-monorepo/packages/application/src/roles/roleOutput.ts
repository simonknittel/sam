import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import { getPublicUploadUrl, type ApplicationContext } from "../context.js";
import {
  ROLE_TAG_REFERENCES_SELECT,
  toRoleTagReferences,
  type RoleTagReference,
} from "./roleTagOutput.js";
import { isRoleVisible } from "./roleVisibility.js";

/** The fields of a role in the role list */
export const ROLE_OUTPUT_SELECT = {
  id: true,
  name: true,
  description: true,
  iconId: true,
  maxLevel: true,
  inherits: { select: { id: true }, orderBy: { name: "asc" } },
  tags: ROLE_TAG_REFERENCES_SELECT,
} as const satisfies Prisma.RoleSelect;

type RoleOutputRow = Prisma.RoleGetPayload<{
  select: typeof ROLE_OUTPUT_SELECT;
}>;

export interface RoleOutput {
  readonly id: string;
  readonly name: string;
  /** Markdown */
  readonly description: string | null;
  readonly icon_url: string | null;
  /** The number of levels, or null for a role without levels */
  readonly max_level: number | null;
  /**
   * The roles whose permissions this role also gives, sorted by name. Only
   * the roles that the actor can see.
   */
  readonly inherited_role_ids: string[];
  /** Sorted by name */
  readonly tags: RoleTagReference[];
}

export const toRoleOutput = (
  context: Pick<ApplicationContext, "urls">,
  actor: Pick<Actor, "authorize">,
  role: RoleOutputRow,
): RoleOutput => ({
  id: role.id,
  name: role.name,
  description: role.description,
  icon_url: role.iconId ? getPublicUploadUrl(context.urls, role.iconId) : null,
  max_level: role.maxLevel,
  inherited_role_ids: role.inherits
    .map((inheritedRole) => inheritedRole.id)
    .filter((inheritedRoleId) => isRoleVisible(actor, inheritedRoleId)),
  tags: toRoleTagReferences(role.tags),
});
