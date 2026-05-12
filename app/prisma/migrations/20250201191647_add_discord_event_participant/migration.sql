-- CreateTable
CREATE TABLE "DiscordEventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordEventParticipant_eventId_discordUserId_key" ON "DiscordEventParticipant"("eventId", "discordUserId");

-- AddForeignKey
ALTER TABLE "DiscordEventParticipant" ADD CONSTRAINT "DiscordEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DiscordEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
