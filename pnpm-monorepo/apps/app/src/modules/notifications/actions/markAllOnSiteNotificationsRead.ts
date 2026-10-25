"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  markAllOnSiteNotificationsRead as markAllOnSiteNotificationsReadUseCase,
  type MarkAllOnSiteNotificationsReadOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import * as z from "zod";

export const markAllOnSiteNotificationsRead = createAuthenticatedAction(
  "markAllOnSiteNotificationsRead",
  z.object({}),
  async (formData, authentication, _data, t) => {
    let result: MarkAllOnSiteNotificationsReadOutput;
    try {
      result = await markAllOnSiteNotificationsReadUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    // The items lost their "new" state in the lists, tiles and dot badges
    if (result.new_items_read) refresh();

    return { success: "Alle als gelesen markiert" };
  },
);
