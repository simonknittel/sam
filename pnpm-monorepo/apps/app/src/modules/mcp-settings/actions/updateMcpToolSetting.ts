"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  setOwnGrantToolEnabled,
  setOwnGrantToolEnabledInputSchema,
} from "@sam-monorepo/application";
import { listToolCatalog } from "@sam-monorepo/mcp";
import { refresh } from "next/cache";
import * as z from "zod";

export const updateMcpToolSetting = createAuthenticatedAction(
  "updateMcpToolSetting",
  setOwnGrantToolEnabledInputSchema,
  async (formData, authentication, data, t) => {
    // The catalog of the tools is in the MCP package, thus the use case
    // cannot check the name
    if (!listToolCatalog().some((tool) => tool.name === data.tool_name))
      return { error: t("Common.badRequest"), requestPayload: formData };

    try {
      await setOwnGrantToolEnabled(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    refresh();

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      grant_id: formData.get("grantId"),
      tool_name: formData.get("toolName"),
      enabled: z.stringbool().parse(formData.get("enabled")),
    }),
  },
);
