# Adding a new node type

1. Add to the `FlowNodeType` enum in `packages/database/prisma/models/career.prisma` (needs a migration, see [docs/changing-database-schema.md](../../../../../../../docs/changing-database-schema.md))
2. Create a folder in `nodes/` (this module) with the name of your new node type in PascalCase (e.g. `MyNode`).
3. Create `CreateOrUpdateForm.tsx`, `getNodeType.ts`, `index.ts`, `Node.tsx` and `schema.ts` in the `nodes/MyNode/client` folder. Add `additionalDataType.ts` if the node stores additional data.
4. Create `createManyMapping.ts`, `index.ts` and `updateFlowSchema.ts` in the `nodes/MyNode/server` folder.
5. Add the new node to `nodeDefinitions` in `nodes/client.ts` and `nodes/server.ts`.
6. Add the new node type to the `RadioGroup` items in `components/CreateOrUpdateNodeModal.tsx`.
