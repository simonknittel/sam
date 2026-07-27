-- DropForeignKey
ALTER TABLE "FlowNode" DROP CONSTRAINT "FlowNode_roleId_fkey";

-- AddForeignKey
ALTER TABLE "FlowNode" ADD CONSTRAINT "FlowNode_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
