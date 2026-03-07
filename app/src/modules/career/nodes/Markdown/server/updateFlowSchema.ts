import { FlowNodeMarkdownPosition, FlowNodeType } from "@prisma/client";
import z from "zod";

export const updateFlowSchema = z.object({
  type: z.literal(FlowNodeType.MARKDOWN),
  id: z.cuid2(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  width: z.number(),
  height: z.number(),
  data: z.object({
    markdown: z.string(),
    markdownPosition: z.enum(FlowNodeMarkdownPosition),
    backgroundColor: z.string().optional(),
    backgroundTransparency: z.number().min(0).max(1).optional(),
  }),
});
