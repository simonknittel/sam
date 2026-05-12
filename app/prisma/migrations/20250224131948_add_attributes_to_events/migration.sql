/*
  Warnings:

  - You are about to drop the column `hash` on the `DiscordEvent` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DiscordEvent_hash_key";

-- AlterTable
ALTER TABLE "DiscordEvent" DROP COLUMN "hash",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discordGuildId" TEXT,
ADD COLUMN     "discordImage" TEXT,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "lineupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startTime" TIMESTAMP(3);
