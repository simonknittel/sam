-- AlterEnum
ALTER TYPE "EventActivityType" ADD VALUE 'PARTICIPATION_TOGGLED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "participationEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "EventTemplate" ADD COLUMN     "participationEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CalendarEntryTypeSetting" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "disabledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEntryTypeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEntryTypeSetting_citizenId_entryType_key" ON "CalendarEntryTypeSetting"("citizenId", "entryType");

-- AddForeignKey
ALTER TABLE "CalendarEntryTypeSetting" ADD CONSTRAINT "CalendarEntryTypeSetting_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

