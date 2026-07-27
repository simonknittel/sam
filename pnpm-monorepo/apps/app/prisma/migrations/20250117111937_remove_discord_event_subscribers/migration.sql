/*
  Warnings:

  - You are about to drop the `DiscordEventSubscriber` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiscordEventSubscriber" DROP CONSTRAINT "DiscordEventSubscriber_userId_fkey";

-- DropTable
DROP TABLE "DiscordEventSubscriber";
