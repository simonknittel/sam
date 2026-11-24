"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  toggleAppFavoriteInputSchema,
  toggleAppFavorite as toggleAppFavoriteUseCase,
  type ToggleAppFavoriteOutput,
} from "@sam-monorepo/application";
import { getAppKey } from "../utils/getAppKey";
import { getAppLinks } from "../utils/queries/getAppLinks";

export const toggleAppFavorite = createAuthenticatedAction(
  "toggleAppFavorite",
  toggleAppFavoriteInputSchema,
  async (formData, authentication, data, t) => {
    /** Redacted apps carry no key, so they never match */
    const apps = await getAppLinks();
    const visibleAppKeys = new Set(
      apps?.flatMap((app) => getAppKey(app) ?? []),
    );

    let result: ToggleAppFavoriteOutput;
    try {
      result = await toggleAppFavoriteUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        { visibleAppKeys },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    /** Deliberately no `refresh()` on success, see `AppsContextProvider` */
    return {
      success: result.is_favorite
        ? "Als Favorit gespeichert."
        : "Favorit entfernt.",
    };
  },
  {
    parseFormData: (formData) => ({ app_key: formData.get("appKey") }),
  },
);
