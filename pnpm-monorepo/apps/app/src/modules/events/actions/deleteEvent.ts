"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  deleteEventInputSchema,
  deleteEvent as deleteEventUseCase,
  DiscordSyncOutcome,
  type DeleteEventOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export const deleteEvent = createAuthenticatedAction(
  "deleteEvent",
  deleteEventInputSchema,
  async (formData, authentication, data, t) => {
    let result: DeleteEventOutput;
    try {
      result = await deleteEventUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        { removesDiscordPublication: true },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: EVENT_ERROR_TEXTS,
      });
    }

    refresh();

    /**
     * Respond with the result. A failed removal from Discord cannot undo the
     * deletion, thus the manager deletes the Discord event by hand.
     */
    return {
      success: "Das Event wurde gelöscht.",
      ...(result.discord?.outcome === DiscordSyncOutcome.Failed
        ? {
            warning:
              "Das Event konnte nicht von Discord entfernt werden und muss dort von Hand gelöscht werden.",
          }
        : {}),
    };
  },
  {
    parseFormData: (formData) => ({ event_id: formData.get("eventId") }),
  },
);
