import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import {
  FlowNodeMarkdownPosition,
  FlowNodeRoleCitizensAlignment,
  FlowNodeRoleImage,
  FlowNodeType,
  FlowRoleAccessType,
} from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { randomUUID } from "node:crypto";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError, ValidationError } from "../errors.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { updateFlow, updateFlowInputSchema } from "./updateFlow.js";

beforeEach(async () => {
  await truncateAllTables();
});

const createFlowWithAccess = async (
  type: FlowRoleAccessType,
  { flowId }: { readonly flowId?: string } = {},
) => {
  const role = await prisma.role.create({ data: { name: "Academy" } });
  const flow = await prisma.flow.create({
    data: {
      id: flowId,
      name: "Academy",
      slug: "academy",
      roleAccess: { create: { roleId: role.id, type } },
    },
  });
  const actor = createTestActor({ userId: "member", roleIds: [role.id] });

  return { role, flow, actor };
};

const createMarkdownNode = (flowId: string, markdown: string) =>
  prisma.flowNode.create({
    data: {
      flowId,
      type: FlowNodeType.MARKDOWN,
      positionX: 0,
      positionY: 0,
      width: 300,
      height: 120,
      markdown,
      markdownPosition: FlowNodeMarkdownPosition.CENTER,
    },
  });

const findAllNodes = () =>
  prisma.flowNode.findMany({ orderBy: { markdown: "asc" } });

test("refuses an edge to a node of a different flow and changes no flow", async () => {
  const { flow, actor } = await createFlowWithAccess(FlowRoleAccessType.UPDATE);
  const otherFlow = await prisma.flow.create({
    data: { name: "Other", slug: "other" },
  });
  const ownNode = await createMarkdownNode(flow.id, "Own");
  const foreignNode = await createMarkdownNode(otherFlow.id, "Foreign");
  const nodesBefore = await findAllNodes();
  const { context, auditEvents } = createTestApplicationContext();

  const update = updateFlow(context, actor, {
    flow_id: flow.id,
    nodes: [
      {
        type: FlowNodeType.MARKDOWN,
        id: ownNode.id,
        position: { x: 0, y: 0 },
        width: 300,
        height: 120,
        data: {
          markdown: "Changed",
          markdownPosition: FlowNodeMarkdownPosition.CENTER,
        },
      },
    ],
    edges: [
      {
        id: "crossing-edge",
        source: ownNode.id,
        sourceHandle: "bottom",
        target: foreignNode.id,
        targetHandle: "top",
      },
    ],
  });

  await expect(update).rejects.toBeInstanceOf(ValidationError);
  await expect(update).rejects.toThrow(CareerErrorMessage.EdgeOutsideFlow);
  expect(await findAllNodes()).toEqual(nodesBefore);
  expect(await prisma.flowEdge.count()).toBe(0);
  expect(auditEvents).toEqual([]);
});

test("refuses a save of an actor whose role can only read the flow", async () => {
  const { flow, actor } = await createFlowWithAccess(FlowRoleAccessType.READ);
  await createMarkdownNode(flow.id, "Own");
  const nodesBefore = await findAllNodes();
  const { context, auditEvents } = createTestApplicationContext();

  await expect(
    updateFlow(context, actor, { flow_id: flow.id, nodes: [], edges: [] }),
  ).rejects.toBeInstanceOf(ForbiddenError);
  expect(await findAllNodes()).toEqual(nodesBefore);
  expect(auditEvents).toEqual([]);
});

test("saves a flow that keeps the UUID of the migration of 2026-08-21", async () => {
  const { flow, actor } = await createFlowWithAccess(
    FlowRoleAccessType.UPDATE,
    { flowId: randomUUID() },
  );
  const { context, auditEvents } = createTestApplicationContext();

  const input = updateFlowInputSchema.parse({
    flow_id: flow.id,
    nodes: [],
    edges: [],
  });

  expect(await updateFlow(context, actor, input)).toEqual({
    flow_id: flow.id,
    node_count: 0,
    edge_count: 0,
  });
  expect(auditEvents).toHaveLength(1);
});

test("replaces the diagram with one node of each type and one edge", async () => {
  const { role, flow, actor } = await createFlowWithAccess(
    FlowRoleAccessType.UPDATE,
  );
  await createMarkdownNode(flow.id, "Removed by the save");
  const markdownNodeId = createId();
  const roleNodeId = createId();
  const roleCitizensNodeId = createId();
  const edgeId = `xy-edge__${markdownNodeId}bottom-${roleNodeId}top`;
  const { context, auditEvents } = createTestApplicationContext();

  /** The payload of the editor, with the display fields of React Flow */
  const input = updateFlowInputSchema.parse({
    flow_id: flow.id,
    nodes: [
      {
        type: FlowNodeType.MARKDOWN,
        id: markdownNodeId,
        position: { x: 1, y: 2 },
        width: 300,
        height: 120,
        selected: true,
        measured: { width: 300, height: 120 },
        data: {
          markdown: "Welcome",
          markdownPosition: FlowNodeMarkdownPosition.LEFT,
          backgroundColor: "#112233",
          backgroundTransparency: 0.5,
        },
      },
      {
        type: FlowNodeType.ROLE,
        id: roleNodeId,
        position: { x: 3, y: 4 },
        width: 200,
        height: 100,
        data: {
          role: { id: role.id, name: role.name },
          roleImage: FlowNodeRoleImage.ICON,
          showUnlocked: true,
        },
      },
      {
        type: FlowNodeType.ROLE_CITIZENS,
        id: roleCitizensNodeId,
        position: { x: 5, y: 6 },
        width: 250,
        height: 150,
        data: {
          role: { id: role.id },
          roleCitizensAlignment: FlowNodeRoleCitizensAlignment.RIGHT,
          roleCitizensHideRole: true,
          showUnlocked: null,
        },
      },
    ],
    edges: [
      {
        id: edgeId,
        source: markdownNodeId,
        sourceHandle: "bottom",
        target: roleNodeId,
        targetHandle: "top",
        type: "smoothstep",
        markerEnd: { type: "arrowclosed" },
      },
    ],
  });

  expect(await updateFlow(context, actor, input)).toEqual({
    flow_id: flow.id,
    node_count: 3,
    edge_count: 1,
  });

  const emptyColumns = {
    flowId: flow.id,
    roleId: null,
    roleImage: null,
    markdown: null,
    markdownPosition: null,
    roleCitizensAlignment: null,
    roleCitizensHideRole: null,
    showUnlocked: null,
    backgroundColor: null,
    backgroundTransparency: null,
  };
  expect(
    await prisma.flowNode.findMany({ orderBy: { positionX: "asc" } }),
  ).toEqual([
    {
      ...emptyColumns,
      id: markdownNodeId,
      type: FlowNodeType.MARKDOWN,
      positionX: 1,
      positionY: 2,
      width: 300,
      height: 120,
      markdown: "Welcome",
      markdownPosition: FlowNodeMarkdownPosition.LEFT,
      backgroundColor: "#112233",
      backgroundTransparency: 0.5,
    },
    {
      ...emptyColumns,
      id: roleNodeId,
      type: FlowNodeType.ROLE,
      positionX: 3,
      positionY: 4,
      width: 200,
      height: 100,
      roleId: role.id,
      roleImage: FlowNodeRoleImage.ICON,
      showUnlocked: true,
    },
    {
      ...emptyColumns,
      id: roleCitizensNodeId,
      type: FlowNodeType.ROLE_CITIZENS,
      positionX: 5,
      positionY: 6,
      width: 250,
      height: 150,
      roleId: role.id,
      roleCitizensAlignment: FlowNodeRoleCitizensAlignment.RIGHT,
      roleCitizensHideRole: true,
    },
  ]);
  expect(await prisma.flowEdge.findMany()).toEqual([
    {
      id: edgeId,
      sourceId: markdownNodeId,
      sourceHandle: "bottom",
      targetId: roleNodeId,
      targetHandle: "top",
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.CAREER_FLOW_UPDATED,
      data: { flowId: flow.id, nodeCount: 3, edgeCount: 1 },
      createdById: actor.userId,
    },
  ]);
});
