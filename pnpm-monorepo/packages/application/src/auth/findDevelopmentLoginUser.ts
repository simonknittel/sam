import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { DEVELOPMENT_LOGIN_USER_WHERE } from "./developmentLoginUser.js";

export const findDevelopmentLoginUserInputSchema = z.object({
  user_id: idSchema,
});

export type FindDevelopmentLoginUserInput = z.infer<
  typeof findDevelopmentLoginUserInputSchema
>;

export interface FindDevelopmentLoginUserOutput {
  readonly id: string;
}

/** No permission check, see the README */
export const findDevelopmentLoginUser = (
  context: ApplicationContext,
  input: FindDevelopmentLoginUserInput,
): Promise<FindDevelopmentLoginUserOutput | null> =>
  context.prisma.user.findFirst({
    where: {
      ...DEVELOPMENT_LOGIN_USER_WHERE,
      id: input.user_id,
    },
    select: {
      id: true,
    },
  });
