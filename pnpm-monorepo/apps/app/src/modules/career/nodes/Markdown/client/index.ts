"use client";

import { FlowNodeType } from "@sam-monorepo/database/browser";
import { CreateOrUpdateForm } from "./CreateOrUpdateForm";
import { getNodeType } from "./getNodeType";
import { Node } from "./Node";

export const markdownNode = {
  enum: FlowNodeType.MARKDOWN,
  getNodeType,
  Node,
  CreateOrUpdateForm,
} as const;
