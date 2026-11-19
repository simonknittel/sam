-- AlterEnum
ALTER TYPE "EventActivityType" ADD VALUE 'APPLICATION_CREATED';
ALTER TYPE "EventActivityType" ADD VALUE 'APPLICATION_APPROVED';
ALTER TYPE "EventActivityType" ADD VALUE 'APPLICATION_DECLINED';
ALTER TYPE "EventActivityType" ADD VALUE 'APPLICATION_WITHDRAWN';
ALTER TYPE "EventActivityType" ADD VALUE 'APPLICATION_REQUIREMENT_TOGGLED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "applicationRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventTemplate" ADD COLUMN     "applicationRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3),
    "approvedById" TEXT,
    "declinedAt" TIMESTAMPTZ(3),
    "declinedById" TEXT,
    "declineReason" TEXT,
    "withdrawnAt" TIMESTAMPTZ(3),
    "withdrawnById" TEXT,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");

-- CreateIndex
CREATE INDEX "EventApplication_eventId_idx" ON "EventApplication"("eventId");

-- CreateIndex
CREATE INDEX "EventApplication_citizenId_idx" ON "EventApplication"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_open_key" ON "EventApplication"("eventId", "citizenId") WHERE ("approvedAt" IS NULL AND "declinedAt" IS NULL AND "withdrawnAt" IS NULL);

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_declinedById_fkey" FOREIGN KEY ("declinedById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_withdrawnById_fkey" FOREIGN KEY ("withdrawnById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- An application has at most one result: approved, declined or withdrawn.
-- Only a declined application has a decline reason.
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_result_check" CHECK (
  num_nonnulls("approvedAt", "declinedAt", "withdrawnAt") <= 1
  AND ("declineReason" IS NULL OR "declinedAt" IS NOT NULL)
);
