-- CreateTable
CREATE TABLE "DiscordEvent" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordEvent_discordId_key" ON "DiscordEvent"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordEvent_hash_key" ON "DiscordEvent"("hash");
