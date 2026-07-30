-- CreateEnum
CREATE TYPE "FlowNodeRoleCitizensAlignment" AS ENUM ('CENTER', 'LEFT');

-- AlterTable
ALTER TABLE "FlowNode" ADD COLUMN     "roleCitizensAlignment" "FlowNodeRoleCitizensAlignment",
ADD COLUMN     "roleCitizensHideRole" BOOLEAN;
