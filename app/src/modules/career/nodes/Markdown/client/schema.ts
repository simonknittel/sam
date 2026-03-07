"use client";
import { FlowNodeMarkdownPosition } from "@prisma/client";
import z from "zod";

export const schema = z.object({
  id: z.cuid2(),
  markdown: z.string(),
  markdownPosition: z.enum(FlowNodeMarkdownPosition),
  backgroundColor: z.string(),
  backgroundTransparency: z.coerce.number().min(0).max(1),
});
