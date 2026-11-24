import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";

export const getLastSeenAtInputSchema = z.object({
  user_id: idSchema.nullable(),
});

export type GetLastSeenAtInput = z.infer<typeof getLastSeenAtInputSchema>;

export const getLastSeenAt = async (
  context: ApplicationContext,
  actor: Actor,
  input: GetLastSeenAtInput,
): Promise<Date | null> => {
  if (!actor.authorize("lastSeen", "read") || !input.user_id) return null;

  const user = await context.prisma.user.findUnique({
    where: { id: input.user_id },
    select: { lastSeenAt: true },
  });

  return user?.lastSeenAt ?? null;
};
