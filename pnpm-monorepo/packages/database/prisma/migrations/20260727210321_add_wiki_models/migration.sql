-- CreateEnum
CREATE TYPE "WikiPageNamespace" AS ENUM ('WIKI');

-- CreateEnum
CREATE TYPE "WikiPageVisibility" AS ENUM ('INHERIT', 'PUBLIC', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "WikiPageEditability" AS ENUM ('INHERIT', 'ALL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "WikiPageAdminability" AS ENUM ('INHERIT', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "WikiPageAccessType" AS ENUM ('READ', 'EDIT', 'ADMIN');

-- CreateEnum
CREATE TYPE "WikiPageSnapshotKind" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "size" INTEGER,
ADD COLUMN     "wikiPageId" TEXT;

-- CreateTable
CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "namespace" "WikiPageNamespace" NOT NULL DEFAULT 'WIKI',
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconId" TEXT,
    "ydoc" BYTEA,
    "content" JSONB,
    "searchText" TEXT NOT NULL DEFAULT '',
    "visibility" "WikiPageVisibility" NOT NULL DEFAULT 'INHERIT',
    "editability" "WikiPageEditability" NOT NULL DEFAULT 'INHERIT',
    "adminability" "WikiPageAdminability" NOT NULL DEFAULT 'INHERIT',
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageRoleAccess" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "type" "WikiPageAccessType" NOT NULL,

    CONSTRAINT "WikiPageRoleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageSnapshot" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "kind" "WikiPageSnapshotKind" NOT NULL,
    "name" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "WikiPageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageFavorite" (
    "citizenId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageFavorite_pkey" PRIMARY KEY ("citizenId","pageId")
);

-- CreateTable
CREATE TABLE "WikiPageVisit" (
    "citizenId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiPageVisit_pkey" PRIMARY KEY ("citizenId","pageId")
);

-- CreateTable
CREATE TABLE "WikiPageReport" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionComment" TEXT,

    CONSTRAINT "WikiPageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "WikiSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "WikiPage_parentId_idx" ON "WikiPage"("parentId");

-- CreateIndex
CREATE INDEX "WikiPage_deletedAt_idx" ON "WikiPage"("deletedAt");

-- CreateIndex
CREATE INDEX "WikiPageRoleAccess_roleId_idx" ON "WikiPageRoleAccess"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageRoleAccess_pageId_roleId_type_key" ON "WikiPageRoleAccess"("pageId", "roleId", "type");

-- CreateIndex
CREATE INDEX "WikiPageSnapshot_pageId_createdAt_idx" ON "WikiPageSnapshot"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "WikiPageFavorite_pageId_idx" ON "WikiPageFavorite"("pageId");

-- CreateIndex
CREATE INDEX "WikiPageVisit_citizenId_lastVisitedAt_idx" ON "WikiPageVisit"("citizenId", "lastVisitedAt");

-- CreateIndex
CREATE INDEX "WikiPageReport_pageId_idx" ON "WikiPageReport"("pageId");

-- CreateIndex
CREATE INDEX "WikiPageReport_resolvedAt_idx" ON "WikiPageReport"("resolvedAt");

-- CreateIndex
CREATE INDEX "Upload_wikiPageId_idx" ON "Upload"("wikiPageId");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageRoleAccess" ADD CONSTRAINT "WikiPageRoleAccess_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageRoleAccess" ADD CONSTRAINT "WikiPageRoleAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSnapshot" ADD CONSTRAINT "WikiPageSnapshot_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSnapshot" ADD CONSTRAINT "WikiPageSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageFavorite" ADD CONSTRAINT "WikiPageFavorite_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageFavorite" ADD CONSTRAINT "WikiPageFavorite_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageVisit" ADD CONSTRAINT "WikiPageVisit_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageVisit" ADD CONSTRAINT "WikiPageVisit_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageReport" ADD CONSTRAINT "WikiPageReport_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageReport" ADD CONSTRAINT "WikiPageReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageReport" ADD CONSTRAINT "WikiPageReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiSetting" ADD CONSTRAINT "WikiSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
