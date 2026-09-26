"use client";

import { FlowNodeRoleCitizensAlignment } from "@sam-monorepo/database/browser";
import * as z from "zod/mini";

export const schema = z.object({
  id: z.cuid2(),
  roleId: z.string(),
  roleCitizensAlignment: z.enum(FlowNodeRoleCitizensAlignment),
  roleCitizensHideRole: z.pipe(
    z.transform((value) => value === "true"),
    z.boolean(),
  ),
  backgroundColor: z.string(),
  backgroundTransparency: z.coerce.number().check(z.gte(0), z.lte(1)),
  showUnlocked: z.pipe(
    z.transform((value) => value === "true"),
    z.boolean(),
  ),
});
