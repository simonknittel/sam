import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  idSchema,
  pageLimitSchema,
  paginateByCursor,
} from "../pagination.js";
import {
  ROLE_OUTPUT_SELECT,
  toRoleOutput,
  type RoleOutput,
} from "./roleOutput.js";
import { compareRoleNames, isRoleVisible } from "./roleVisibility.js";

/** The role names are much shorter */
const MAXIMUM_QUERY_LENGTH = 100;

export const listRolesInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(MAXIMUM_QUERY_LENGTH)
    .optional()
    .describe("A part of the role name, without regard to the case."),
  tag_id: idSchema
    .optional()
    .describe(
      "Gives only the roles with this tag (the id of a tag of a role).",
    ),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListRolesInput = z.output<typeof listRolesInputSchema>;

export interface ListRolesOutput {
  readonly roles: RoleOutput[];
  readonly next_cursor: string | null;
}

/** A tag that does not exist gives an empty list */
export const listRoles = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListRolesInput,
): Promise<ListRolesOutput> => {
  const roles = await context.prisma.role.findMany({
    where: {
      name: input.query
        ? { contains: input.query, mode: "insensitive" }
        : undefined,
      tags: input.tag_id ? { some: { tagId: input.tag_id } } : undefined,
    },
    select: ROLE_OUTPUT_SELECT,
  });

  const page = paginateByCursor(
    roles
      .filter((role) => isRoleVisible(actor, role.id))
      .toSorted(compareRoleNames),
    {
      cursor: input.cursor,
      pageSize: input.limit,
      getCursor: (role) => role.id,
    },
  );

  return {
    roles: page.items.map((role) => toRoleOutput(context, actor, role)),
    next_cursor: page.nextCursor,
  };
};
