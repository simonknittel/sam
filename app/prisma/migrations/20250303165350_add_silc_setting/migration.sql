-- CreateEnum
CREATE TYPE "SilcSettingKey" AS ENUM ('AUEC_CONVERSION_RATE');

-- CreateTable
CREATE TABLE "SilcSetting" (
    "key" "SilcSettingKey" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedById" TEXT,

    CONSTRAINT "SilcSetting_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "SilcSetting" ADD CONSTRAINT "SilcSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
