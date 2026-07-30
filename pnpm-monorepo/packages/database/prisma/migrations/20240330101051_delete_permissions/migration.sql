/*
  Warnings:

  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PermissionAttribute` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "PermissionAttribute" DROP CONSTRAINT "PermissionAttribute_permissionId_fkey";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "PermissionAttribute";
