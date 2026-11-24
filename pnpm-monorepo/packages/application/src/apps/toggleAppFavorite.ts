import {
  APP_KEY_PATTERN,
  AuditEventType,
  MAXIMUM_APP_KEY_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { AppErrorMessage } from "./appErrors.js";

export const toggleAppFavoriteInputSchema = z.object({
  app_key: z
    .string()
    .max(MAXIMUM_APP_KEY_LENGTH)
    .regex(APP_KEY_PATTERN)
    .describe("The namespaced key of the app, for example integrated:tasks."),
});

export type ToggleAppFavoriteInput = z.output<
  typeof toggleAppFavoriteInputSchema
>;

export interface ToggleAppFavoriteOptions {
  /**
   * A redacted app has no key, thus an unknown or redacted app creates no row
   */
  readonly visibleAppKeys: ReadonlySet<string>;
}

export interface ToggleAppFavoriteOutput {
  readonly app_key: string;
  readonly is_favorite: boolean;
}

export const toggleAppFavorite = (
  context: ApplicationContext,
  actor: Actor,
  input: ToggleAppFavoriteInput,
  options: ToggleAppFavoriteOptions,
): Promise<ToggleAppFavoriteOutput> =>
  withSpan(context, "toggleAppFavorite", async () => {
    const citizenId = requireCitizen(actor).id;

    if (!options.visibleAppKeys.has(input.app_key))
      throw new NotFoundError(AppErrorMessage.AppNotFound);

    const existingFavorite = await context.prisma.citizenAppFavorite.findUnique(
      {
        where: { citizenId_appKey: { citizenId, appKey: input.app_key } },
        select: { id: true },
      },
    );

    if (existingFavorite) {
      await context.prisma.citizenAppFavorite.delete({
        where: { id: existingFavorite.id },
      });
    } else {
      await context.prisma.citizenAppFavorite.create({
        data: { citizenId, appKey: input.app_key },
      });
    }

    await context.audit.create([
      {
        type: existingFavorite
          ? AuditEventType.APP_FAVORITE_REMOVED
          : AuditEventType.APP_FAVORITE_ADDED,
        data: { appKey: input.app_key, citizenId },
        createdById: actor.userId,
      },
    ]);

    return { app_key: input.app_key, is_favorite: !existingFavorite };
  });
