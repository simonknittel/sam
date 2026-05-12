-- CreateEnum
CREATE TYPE "FlowNodeMarkdownPosition" AS ENUM ('LEFT', 'RIGHT', 'CENTER');

-- AlterEnum
ALTER TYPE "FlowNodeType" ADD VALUE 'MARKDOWN';

-- AlterTable
ALTER TABLE "FlowNode" ADD COLUMN     "markdown" TEXT,
ADD COLUMN     "markdownPosition" "FlowNodeMarkdownPosition";
