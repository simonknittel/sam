-- CreateEnum
CREATE TYPE "WikiPageSidebarMode" AS ENUM ('VISIBLE', 'HIDDEN', 'CHILDREN_HIDDEN');

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "sidebarMode" "WikiPageSidebarMode" NOT NULL DEFAULT 'VISIBLE';

-- CreateTable
CREATE TABLE "WikiTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "WikiTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageTag" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "WikiPageTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiTag_name_key" ON "WikiTag"("name");

-- CreateIndex
CREATE INDEX "WikiPageTag_tagId_idx" ON "WikiPageTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageTag_pageId_tagId_key" ON "WikiPageTag"("pageId", "tagId");

-- AddForeignKey
ALTER TABLE "WikiTag" ADD CONSTRAINT "WikiTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageTag" ADD CONSTRAINT "WikiPageTag_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageTag" ADD CONSTRAINT "WikiPageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "WikiTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageTag" ADD CONSTRAINT "WikiPageTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
