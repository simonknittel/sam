-- AlterTable
ALTER TABLE "OAuthRefreshToken" ADD COLUMN "usedAgainAt" TIMESTAMPTZ(3);
