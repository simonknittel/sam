"use client";

import { FlowNodeType } from "@sam-monorepo/database/browser";
import { CreateOrUpdateForm } from "./CreateOrUpdateForm";
import { getNodeType } from "./getNodeType";
import { Node } from "./Node";

export const roleNode = {
  enum: FlowNodeType.ROLE,
  getNodeType,
  Node,
  CreateOrUpdateForm,
} as const;
