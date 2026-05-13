-- CreateEnum
CREATE TYPE "FlowNodeType" AS ENUM ('ROLE');

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowNode" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "type" "FlowNodeType" NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "FlowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowEdge" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,

    CONSTRAINT "FlowEdge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FlowNode" ADD CONSTRAINT "FlowNode_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowNode" ADD CONSTRAINT "FlowNode_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowEdge" ADD CONSTRAINT "FlowEdge_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowEdge" ADD CONSTRAINT "FlowEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "FlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowEdge" ADD CONSTRAINT "FlowEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "FlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
