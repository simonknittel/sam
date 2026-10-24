"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  setOwnGrantToolEnabled,
  setOwnGrantToolEnabledInputSchema,
} from "@sam-monorepo/application";
import { isCatalogToolName } from "@sam-monorepo/mcp";
import * as z from "zod";

export const updateMcpToolSetting = createUseCaseAction({
  name: "updateMcpToolSetting",
  schema: setOwnGrantToolEnabledInputSchema.refine((input) =>
    isCatalogToolName(input.tool_name),
  ),
  useCase: setOwnGrantToolEnabled,
  parseFormData: (formData) => ({
    grant_id: formData.get("grantId"),
    tool_name: formData.get("toolName"),
    enabled: z.stringbool().parse(formData.get("enabled")),
  }),
  success: (t) => t("Common.successfullySaved"),
});
