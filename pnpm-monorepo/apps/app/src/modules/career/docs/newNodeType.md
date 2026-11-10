# Add a new node type

1. Add the new type to the `FlowNodeType` enum in `packages/database/prisma/models/career.prisma` (this needs a migration, see [docs/changing-database-schema.md](../../../../../../../docs/changing-database-schema.md))
2. Create a folder in `nodes/` (this module) with the name of the new node type in PascalCase (for example `MyNode`).
3. Create `CreateOrUpdateForm.tsx`, `getNodeType.ts`, `index.ts`, `Node.tsx` and `schema.ts` in the `nodes/MyNode/client` folder. Add `additionalDataType.ts` if the node stores additional data.
4. Add the schema of the new node type to `flowNodeSchema`, and a `case` for it to `toFlowNodeCreateData()`, in `packages/application/src/career/flowNodes.ts`. The `default` case of `toFlowNodeCreateData()` does not compile until the `case` exists. Add each new column of a node to `FLOW_DIAGRAM_NODE_SELECT` in `packages/application/src/career/flowDiagram.ts`.
5. Add the new node to `nodeDefinitions` in `nodes/client.ts`. Helpers that multiple node types use are in `nodes/shared/`.
6. Add the new node type to the `RadioGroup` items in `components/CreateOrUpdateNodeModal.tsx`.
