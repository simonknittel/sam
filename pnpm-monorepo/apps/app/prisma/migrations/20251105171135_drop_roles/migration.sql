/*
  Warnings:

  - You are about to drop the column `roles` on the `Entity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Entity_roles_idx";

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "roles";
