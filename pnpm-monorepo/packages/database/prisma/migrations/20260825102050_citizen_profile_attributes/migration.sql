-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "birthdayDay" INTEGER,
ADD COLUMN     "birthdayGreetingSentAt" TIMESTAMP(3),
ADD COLUMN     "birthdayMonth" INTEGER,
ADD COLUMN     "timezone" TEXT;
