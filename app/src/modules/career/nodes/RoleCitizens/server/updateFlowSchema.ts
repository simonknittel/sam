import { FlowNodeRoleCitizensAlignment, FlowNodeType } from "@prisma/client";
import z from "zod";

export const updateFlowSchema = z.object({
  type: z.literal(FlowNodeType.ROLE_CITIZENS),
  id: z.cuid2(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  width: z.number(),
  height: z.number(),
  data: z.object({
    role: z.object({
      id: z.cuid(),
    }),
    roleCitizensAlignment: z.enum(FlowNodeRoleCitizensAlignment),
    roleCitizensHideRole: z.boolean(),
    backgroundColor: z.string().optional(),
    backgroundTransparency: z.number().min(0).max(1).optional(),
    showUnlocked: z.boolean().nullish(),
  }),
});
