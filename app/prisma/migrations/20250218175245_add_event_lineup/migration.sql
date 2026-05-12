-- AlterTable
ALTER TABLE "DiscordEvent" ADD COLUMN     "discordCreatorId" TEXT,
ADD COLUMN     "discordName" TEXT;

-- CreateTable
CREATE TABLE "EventPosition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredVariantId" TEXT,
    "acceptedApplicationId" TEXT,

    CONSTRAINT "EventPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPositionApplication" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPositionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventPositionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventPositionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventPositionApplication_positionId_citizenId_key" ON "EventPositionApplication"("positionId", "citizenId");

-- CreateIndex
CREATE INDEX "_EventPositionToRole_B_index" ON "_EventPositionToRole"("B");

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DiscordEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_requiredVariantId_fkey" FOREIGN KEY ("requiredVariantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_acceptedApplicationId_fkey" FOREIGN KEY ("acceptedApplicationId") REFERENCES "EventPositionApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPositionApplication" ADD CONSTRAINT "EventPositionApplication_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPositionApplication" ADD CONSTRAINT "EventPositionApplication_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPositionToRole" ADD CONSTRAINT "_EventPositionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPositionToRole" ADD CONSTRAINT "_EventPositionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
