"use client";

import { FlowNodeType } from "@/generated/prisma/browser";
import { CreateOrUpdateForm } from "./CreateOrUpdateForm";
import { getNodeType } from "./getNodeType";
import { Node } from "./Node";

export const roleCitizensNode = {
  enum: FlowNodeType.ROLE_CITIZENS,
  getNodeType,
  Node,
  CreateOrUpdateForm,
} as const;
