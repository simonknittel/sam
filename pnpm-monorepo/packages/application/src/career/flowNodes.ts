import {
  FlowNodeMarkdownPosition,
  FlowNodeRoleCitizensAlignment,
  FlowNodeRoleImage,
  FlowNodeType,
  type Prisma,
} from "@sam-monorepo/database/client";
import { MAXIMUM_FLOW_MARKDOWN_LENGTH } from "@sam-monorepo/domain";
import * as z from "zod";
import { idSchema } from "../pagination.js";

/** The limit against a crafted payload. A flow of the editor has far fewer. */
export const MAXIMUM_FLOW_NODES = 250;

export const MAXIMUM_FLOW_EDGES = 250;

/**
 * React Flow builds the id of an edge from the ids of its two nodes and
 * their handles: about 70 characters.
 */
const MAXIMUM_FLOW_EDGE_ID_LENGTH = 255;

const flowNodeBoxShape = {
  id: idSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  width: z.number(),
  height: z.number(),
};

const flowNodeBackgroundShape = {
  backgroundColor: z.string().optional(),
  backgroundTransparency: z.number().min(0).max(1).optional(),
};

const markdownFlowNodeSchema = z.object({
  type: z.literal(FlowNodeType.MARKDOWN),
  ...flowNodeBoxShape,
  data: z.object({
    markdown: z.string().max(MAXIMUM_FLOW_MARKDOWN_LENGTH),
    markdownPosition: z.enum(FlowNodeMarkdownPosition),
    ...flowNodeBackgroundShape,
  }),
});

const roleFlowNodeSchema = z.object({
  type: z.literal(FlowNodeType.ROLE),
  ...flowNodeBoxShape,
  data: z.object({
    role: z.object({
      id: idSchema,
    }),
    roleImage: z.enum(FlowNodeRoleImage),
    ...flowNodeBackgroundShape,
    showUnlocked: z.boolean().nullish(),
  }),
});

const roleCitizensFlowNodeSchema = z.object({
  type: z.literal(FlowNodeType.ROLE_CITIZENS),
  ...flowNodeBoxShape,
  data: z.object({
    role: z.object({
      id: idSchema,
    }),
    roleCitizensAlignment: z.enum(FlowNodeRoleCitizensAlignment),
    roleCitizensHideRole: z.boolean(),
    ...flowNodeBackgroundShape,
    showUnlocked: z.boolean().nullish(),
  }),
});

/**
 * A node of the editor (React Flow). The object schemas remove the display
 * fields of React Flow, for example `selected` and `measured`.
 */
export const flowNodeSchema = z.discriminatedUnion("type", [
  markdownFlowNodeSchema,
  roleFlowNodeSchema,
  roleCitizensFlowNodeSchema,
]);

export type FlowNodeInput = z.infer<typeof flowNodeSchema>;

export const flowEdgeSchema = z.object({
  id: z.string().min(1).max(MAXIMUM_FLOW_EDGE_ID_LENGTH),
  source: idSchema,
  sourceHandle: z.string(),
  target: idSchema,
  targetHandle: z.string(),
});

export const toFlowNodeCreateData = (
  node: FlowNodeInput,
  flowId: string,
): Prisma.FlowNodeCreateManyInput => {
  const commonColumns = {
    id: node.id,
    flowId,
    type: node.type,
    positionX: node.position.x,
    positionY: node.position.y,
    width: node.width,
    height: node.height,
    backgroundColor: node.data.backgroundColor,
    backgroundTransparency: node.data.backgroundTransparency,
  };

  switch (node.type) {
    case FlowNodeType.MARKDOWN:
      return {
        ...commonColumns,
        markdown: node.data.markdown,
        markdownPosition: node.data.markdownPosition,
      };

    case FlowNodeType.ROLE:
      return {
        ...commonColumns,
        roleId: node.data.role.id,
        roleImage: node.data.roleImage,
        showUnlocked: node.data.showUnlocked,
      };

    case FlowNodeType.ROLE_CITIZENS:
      return {
        ...commonColumns,
        roleId: node.data.role.id,
        roleCitizensAlignment: node.data.roleCitizensAlignment,
        roleCitizensHideRole: node.data.roleCitizensHideRole,
        showUnlocked: node.data.showUnlocked,
      };

    default:
      throw new Error(
        `Unknown flow node type: ${JSON.stringify(node satisfies never)}`,
      );
  }
};
