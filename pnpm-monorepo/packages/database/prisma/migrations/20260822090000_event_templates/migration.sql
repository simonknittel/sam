-- Event templates: reusable blueprints for standalone app events. Instead of
-- parallel tables for template lineups and template briefings, EventPosition,
-- WikiPage and WikiTag are generalized to an event-or-template container, so
-- one editor codebase serves both. The hand-written CHECK constraints at the
-- bottom are what keeps that generalization honest.

-- CreateEnum
CREATE TYPE "EventTemplateAccessType" AS ENUM ('READ', 'EDIT');

-- AlterTable
ALTER TABLE "EventPosition" ADD COLUMN     "templateId" TEXT,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "WikiTag" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageId" TEXT,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "ownedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTemplateVisibilityRole" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTemplateVisibilityRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTemplateRoleAccess" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "type" "EventTemplateAccessType" NOT NULL,

    CONSTRAINT "EventTemplateRoleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTemplate_ownedById_idx" ON "EventTemplate"("ownedById");

-- CreateIndex
CREATE INDEX "EventTemplate_deletedAt_idx" ON "EventTemplate"("deletedAt");

-- CreateIndex
CREATE INDEX "EventTemplateVisibilityRole_roleId_idx" ON "EventTemplateVisibilityRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTemplateVisibilityRole_templateId_roleId_key" ON "EventTemplateVisibilityRole"("templateId", "roleId");

-- CreateIndex
CREATE INDEX "EventTemplateRoleAccess_roleId_idx" ON "EventTemplateRoleAccess"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTemplateRoleAccess_templateId_roleId_key" ON "EventTemplateRoleAccess"("templateId", "roleId");

-- CreateIndex
CREATE INDEX "EventPosition_eventId_idx" ON "EventPosition"("eventId");

-- CreateIndex
CREATE INDEX "EventPosition_templateId_idx" ON "EventPosition"("templateId");

-- CreateIndex
CREATE INDEX "WikiPage_templateId_idx" ON "WikiPage"("templateId");

-- CreateIndex
CREATE INDEX "WikiTag_templateId_idx" ON "WikiTag"("templateId");

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateVisibilityRole" ADD CONSTRAINT "EventTemplateVisibilityRole_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateVisibilityRole" ADD CONSTRAINT "EventTemplateVisibilityRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateRoleAccess" ADD CONSTRAINT "EventTemplateRoleAccess_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplateRoleAccess" ADD CONSTRAINT "EventTemplateRoleAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiTag" ADD CONSTRAINT "WikiTag_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A position belongs to exactly one container: an event or a template. The
-- column stayed NOT NULL until now, so `eventId IS NOT NULL` was the implicit
-- invariant every event-scoped query relies on; this keeps it enforced from
-- the other side. `num_nonnulls` counts the non-NULL arguments.
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_container_check" CHECK (num_nonnulls("eventId", "templateId") = 1);

-- Replaces the constraint from the event_wiki_scoping migration: EVENT-
-- namespace pages now belong to an event OR a template, never to both, and
-- WIKI-namespace pages to neither. The namespace is compared as text for the
-- same reason as in that migration.
ALTER TABLE "WikiPage" DROP CONSTRAINT "WikiPage_namespace_eventId_check";
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_namespace_container_check" CHECK (
    CASE
        WHEN "namespace"::text = 'EVENT' THEN num_nonnulls("eventId", "templateId") = 1
        ELSE num_nonnulls("eventId", "templateId") = 0
    END
);

-- Tags live in exactly one scope: the global wiki (no container) or a single
-- event or template.
ALTER TABLE "WikiTag" ADD CONSTRAINT "WikiTag_container_check" CHECK (num_nonnulls("eventId", "templateId") <= 1);

-- Tag names stay unique per scope. The global index has to exclude template
-- tags as well now, and templates get an index of their own. Partial indexes
-- because a compound unique would treat every NULL container as distinct;
-- Prisma cannot express them, so keep these in sync with the WikiTag model
-- comment.
DROP INDEX "WikiTag_global_name_key";
CREATE UNIQUE INDEX "WikiTag_global_name_key" ON "WikiTag"("name") WHERE "eventId" IS NULL AND "templateId" IS NULL;
CREATE UNIQUE INDEX "WikiTag_templateId_name_key" ON "WikiTag"("templateId", "name") WHERE "templateId" IS NOT NULL;
