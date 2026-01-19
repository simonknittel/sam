import { isOpenAIEnabled } from "@/modules/common/utils/isOpenAIEnabled";
import { log } from "@/modules/logging";
import { getRoles } from "@/modules/roles/queries";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { env } from "process";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const aiRouter = createTRPCRouter({
  getRoleNameSuggestions: protectedProcedure.query(async () => {
    if (!(await isOpenAIEnabled("RoleNameSuggestions")))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Generation is disabled",
      });

    const existingRoles = await getRoles();
    const existingRoleNames = existingRoles.map((role) => role.name);

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const messages = [
      {
        role: "system",
        content:
          'We are a military organization in a sci-fi setting. We want to set up the organization structure. Generate four new role names based on the given ones. Also, generate an additional one which is not based on the other ones. Only respond with the role names. Don\'t include a description or similar. Respond using the JSON format. The JSON key should be named "roleNames".',
      },
      { role: "user", content: existingRoleNames.join(", ") },
    ] satisfies ChatCompletionMessageParam[];

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: {
        type: "json_object",
      },
    });

    log.info("Role name suggestions", {
      messages,
      usage: chatCompletion.usage,
    });

    try {
      if (!chatCompletion.choices[0]?.message.content)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate role names",
        });

      const parsedJson: unknown = JSON.parse(
        chatCompletion.choices[0].message.content,
      );

      const response = z
        .object({
          roleNames: z.array(z.string()),
        })
        .parse(parsedJson);

      return {
        prompt: {
          system: messages[0].content,
          user: messages[1].content,
        },
        roleNames: response.roleNames,
      };
    } catch (error) {
      log.error("Failed to parse role names", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate role names",
      });
    }
  }),
});
