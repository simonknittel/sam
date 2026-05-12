import { FlowNodeType } from "@/generated/prisma/client";
import { createManyMapping } from "./createManyMapping";
import { updateFlowSchema } from "./updateFlowSchema";

export const roleCitizensNode = {
  enum: FlowNodeType.ROLE_CITIZENS,
  updateFlowSchema,
  createManyMapping,
} as const;
