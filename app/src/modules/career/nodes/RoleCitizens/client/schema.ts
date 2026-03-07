"use client";

import { FlowNodeRoleCitizensAlignment } from "@prisma/client";
import z from "zod";

export const schema = z.object({
  id: z.cuid2(),
  roleId: z.string(),
  roleCitizensAlignment: z.enum(FlowNodeRoleCitizensAlignment),
  roleCitizensHideRole: z.preprocess((value) => value === "true", z.boolean()),
  backgroundColor: z.string(),
  backgroundTransparency: z.coerce.number().min(0).max(1),
  showUnlocked: z.preprocess((value) => value === "true", z.boolean()),
});
