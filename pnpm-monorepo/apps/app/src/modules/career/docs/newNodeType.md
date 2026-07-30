# Adding a new node type

1. Add to `FlowNodeType` enum in `career.prisma`
2. Create a folder in `components/nodes` with the name of your new node type in PascalCase (e.g. `MyNode`).
3. Create `additionalDataType.ts`, `CreateOrUpdateForm.tsx`, `getNodeType.ts`, `index.ts`, `Node.tsx` and `schema.ts` in `nodes/MyNode/client` folder.
4. Create `updateFlowSchema.ts` in `nodes/MyNode/server` folder.
5. Add new node to `nodeDefinitions` in `nodes/client.ts` and `nodes/server.ts`.
6. Add new node to `components/CreateOrUpdateNodeModal.tsx`.
