-- AlterEnum
ALTER TYPE "EventActivityType" ADD VALUE 'INVITATION_CREATED';
ALTER TYPE "EventActivityType" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "EventActivityType" ADD VALUE 'INVITATION_DECLINED';
ALTER TYPE "EventActivityType" ADD VALUE 'INVITATION_WITHDRAWN';

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "declinedAt" TIMESTAMPTZ(3),
    "declineComment" TEXT,
    "withdrawnAt" TIMESTAMPTZ(3),
    "withdrawnById" TEXT,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventInvitation_citizenId_idx" ON "EventInvitation"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_open_key" ON "EventInvitation"("eventId", "citizenId") WHERE ("acceptedAt" IS NULL AND "declinedAt" IS NULL AND "withdrawnAt" IS NULL);

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_withdrawnById_fkey" FOREIGN KEY ("withdrawnById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- An invitation has at most one result: accepted, declined or withdrawn. Only
-- a declined invitation has a decline comment.
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_result_check" CHECK (
  num_nonnulls("acceptedAt", "declinedAt", "withdrawnAt") <= 1
  AND ("declineComment" IS NULL OR "declinedAt" IS NOT NULL)
);
