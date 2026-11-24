import * as z from "zod";
import type { ApplicationContext } from "../context.js";

/** A real session token is much shorter; the limit only bounds the input */
const MAXIMUM_SESSION_TOKEN_LENGTH = 256;

export const findSessionIdByTokenInputSchema = z.object({
  session_token: z.string().min(1).max(MAXIMUM_SESSION_TOKEN_LENGTH),
});

export type FindSessionIdByTokenInput = z.infer<
  typeof findSessionIdByTokenInputSchema
>;

/**
 * The token is a secret: only the id leaves the use case, and the token never
 * goes into a log or into an error. No permission check, see the README.
 */
export const findSessionIdByToken = async (
  context: ApplicationContext,
  input: FindSessionIdByTokenInput,
): Promise<string | null> => {
  const session = await context.prisma.session.findUnique({
    where: {
      sessionToken: input.session_token,
    },
    select: {
      id: true,
    },
  });

  return session?.id ?? null;
};
