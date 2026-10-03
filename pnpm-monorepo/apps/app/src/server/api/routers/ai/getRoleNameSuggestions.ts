import { env } from "@/env";
import { authorize } from "@/modules/auth/server";
import { isOpenAIEnabled } from "@/modules/common/utils/isOpenAIEnabled";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The prompt asks for five names. The limit leaves room for a model that
 * gives some more, but stops a response with an unlimited list.
 */
const MAXIMUM_ROLE_NAMES = 10;

/**
 * A user waits for the suggestions, and a response usually arrives within
 * a few seconds. The default of the SDK is 10 minutes.
 */
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

const FAILURE_MESSAGE = "Failed to generate role names";

const responseSchema = z.object({
  roleNames: z.array(z.string()).max(MAXIMUM_ROLE_NAMES),
});

export const getRoleNameSuggestions = protectedProcedure.query(
  async ({ ctx }) => {
    if (!(await authorize(ctx.session, "role", "manage")))
      throw new TRPCError({ code: "FORBIDDEN" });

    if (!(await isOpenAIEnabled()))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Generation is disabled",
      });

    const existingRoles = await ctx.prisma.role.findMany({
      select: {
        name: true,
      },
    });
    const existingRoleNames = existingRoles.map((role) => role.name);

    const defaultHeaders = new Headers();
    if (env.OPENAI_EXTRA_API_KEY)
      defaultHeaders.set("X-Api-Key", env.OPENAI_EXTRA_API_KEY);

    /**
     * Loaded on demand: the tRPC route bundles all routers, and only this
     * rarely used procedure needs the large SDK
     */
    const [{ default: OpenAI }, { zodResponseFormat }] = await Promise.all([
      import("openai"),
      import("openai/helpers/zod"),
    ]);
    const openai = new OpenAI({
      baseURL: env.OPENAI_BASE_URL,
      apiKey: env.OPENAI_API_KEY,
      defaultHeaders: {
        ...Object.fromEntries(defaultHeaders.entries()),
      },
      timeout: REQUEST_TIMEOUT_MILLISECONDS,
      // The query of the client already retries a failed request (see
      // `Suggestions.tsx`). Retries of the SDK would multiply the wait.
      maxRetries: 0,
    });

    const messages = [
      {
        role: "system",
        content:
          'We are a military organization in a sci-fi setting. We want to set up the organization structure. Generate four new role names based on the given ones. Also, generate an additional one which is not based on the other ones. Only respond with the role names. Don\'t include a description or similar. Respond using the JSON format. The JSON key should be named "roleNames".',
      },
      { role: "user", content: existingRoleNames.join(", ") },
    ] satisfies ChatCompletionMessageParam[];

    try {
      const chatCompletion = await openai.chat.completions.parse({
        messages,
        model: "openai/gpt-5.4-mini",
        max_tokens: 1024,
        response_format: zodResponseFormat(responseSchema, "role_names"),
      });

      log.info("Role name suggestions", {
        messages,
        usage: chatCompletion.usage,
      });

      const choice = chatCompletion.choices[0];
      const roleNames = choice?.message.parsed?.roleNames;
      if (!roleNames) {
        log.error(FAILURE_MESSAGE, {
          reason: "The response contains no role names",
          refusal: choice?.message.refusal,
          finishReason: choice?.finish_reason,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: FAILURE_MESSAGE,
        });
      }

      return {
        prompt: {
          system: messages[0].content,
          user: messages[1].content,
        },
        roleNames,
      };
    } catch (error) {
      throw toTrpcError(error, FAILURE_MESSAGE);
    }
  },
);
