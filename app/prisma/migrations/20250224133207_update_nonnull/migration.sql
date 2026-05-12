/*
  Warnings:

  - Made the column `discordCreatorId` on table `DiscordEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordName` on table `DiscordEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startTime` on table `DiscordEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DiscordEvent" ALTER COLUMN "discordCreatorId" SET NOT NULL,
ALTER COLUMN "discordName" SET NOT NULL,
ALTER COLUMN "startTime" SET NOT NULL;
