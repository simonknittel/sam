"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  updateEventInputSchema,
  updateEvent as updateEventUseCase,
  type UpdateEventOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { getDiscordSyncWarning } from "../utils/discordPublishing";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";
import { parseEventDetailsFormData } from "../utils/eventFormData";

export const updateEvent = createAuthenticatedAction(
  "updateEvent",
  updateEventInputSchema,
  async (formData, authentication, data, t) => {
    let result: UpdateEventOutput;
    try {
      result = await updateEventUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        { syncsDiscordPublication: true },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: EVENT_ERROR_TEXTS,
      });
    }

    /**
     * Also without changes: possibly a different tab or manager saved the
     * same values before, and the page must show them.
     */
    refresh();

    /**
     * A Discord problem never undoes the save — it only comes back as a
     * warning next to the success message. Narrowing a published event's
     * visibility does not narrow it on Discord, thus that is said out loud.
     */
    const discordSync = result.discord?.sync;
    const warning =
      (discordSync ? getDiscordSyncWarning(discordSync) : null) ??
      (result.discord?.staysVisibleOnDiscord
        ? "Das Event bleibt auf Discord für alle Mitglieder des Servers sichtbar. Entferne es dort, wenn das nicht gewollt ist."
        : null);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
      ...(warning ? { warning } : {}),
    };
  },
  {
    parseFormData: (formData) => ({
      event_id: formData.get("eventId"),
      ...parseEventDetailsFormData(formData),
    }),
  },
);
