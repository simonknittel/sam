import { FlowNodeType } from "@/generated/prisma/client";
import { createManyMapping } from "./createManyMapping";
import { updateFlowSchema } from "./updateFlowSchema";

export const markdownNode = {
  enum: FlowNodeType.MARKDOWN,
  updateFlowSchema,
  createManyMapping,
} as const;
