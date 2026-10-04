"use client";

import { FlowNodeRoleImage } from "@sam-monorepo/database/browser";
import * as z from "zod/mini";

export const schema = z.object({
  roleImage: z.enum(FlowNodeRoleImage),
  backgroundColor: z.string(),
  backgroundTransparency: z.coerce.number().check(z.gte(0), z.lte(1)),
  showUnlocked: z.pipe(
    z.transform((value) => value === "true"),
    z.boolean(),
  ),
});
