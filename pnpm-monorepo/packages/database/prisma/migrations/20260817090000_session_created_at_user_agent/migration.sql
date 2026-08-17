-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "createdAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
