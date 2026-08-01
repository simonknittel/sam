-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedById" TEXT,
ADD COLUMN     "bannedReason" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
