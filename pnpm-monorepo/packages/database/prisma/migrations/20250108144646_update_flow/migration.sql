/*
  Warnings:

  - You are about to drop the column `flowId` on the `FlowEdge` table. All the data in the column will be lost.
  - You are about to drop the column `sourceNodeId` on the `FlowEdge` table. All the data in the column will be lost.
  - You are about to drop the column `targetNodeId` on the `FlowEdge` table. All the data in the column will be lost.
  - Added the required column `sourceHandle` to the `FlowEdge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceId` to the `FlowEdge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetHandle` to the `FlowEdge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetId` to the `FlowEdge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `FlowEdge` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FlowNodeRoleImage" AS ENUM ('ICON', 'THUMBNAIL');

-- DropForeignKey
ALTER TABLE "FlowEdge" DROP CONSTRAINT "FlowEdge_flowId_fkey";

-- DropForeignKey
ALTER TABLE "FlowEdge" DROP CONSTRAINT "FlowEdge_sourceNodeId_fkey";

-- DropForeignKey
ALTER TABLE "FlowEdge" DROP CONSTRAINT "FlowEdge_targetNodeId_fkey";

-- AlterTable
ALTER TABLE "FlowEdge" DROP COLUMN "flowId",
DROP COLUMN "sourceNodeId",
DROP COLUMN "targetNodeId",
ADD COLUMN     "sourceHandle" TEXT NOT NULL,
ADD COLUMN     "sourceId" TEXT NOT NULL,
ADD COLUMN     "targetHandle" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FlowNode" ADD COLUMN     "backgroundColor" TEXT,
ADD COLUMN     "backgroundTransparency" DOUBLE PRECISION,
ADD COLUMN     "roleImage" "FlowNodeRoleImage";

-- AddForeignKey
ALTER TABLE "FlowEdge" ADD CONSTRAINT "FlowEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowEdge" ADD CONSTRAINT "FlowEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
