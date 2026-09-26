"use client";

import { FlowNodeMarkdownPosition } from "@sam-monorepo/database/browser";
import * as z from "zod/mini";

export const schema = z.object({
  id: z.cuid2(),
  markdown: z.string().check(z.maxLength(5000)),
  markdownPosition: z.enum(FlowNodeMarkdownPosition),
  backgroundColor: z.optional(z.string()),
  backgroundTransparency: z.coerce.number().check(z.gte(0), z.lte(1)),
});
