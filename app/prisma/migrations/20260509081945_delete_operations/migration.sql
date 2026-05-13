/*
  Warnings:

  - You are about to drop the `Operation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OperationMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OperationUnit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OperationMember" DROP CONSTRAINT "OperationMember_operationId_fkey";

-- DropForeignKey
ALTER TABLE "OperationMember" DROP CONSTRAINT "OperationMember_operationUnitId_fkey";

-- DropForeignKey
ALTER TABLE "OperationMember" DROP CONSTRAINT "OperationMember_shipId_fkey";

-- DropForeignKey
ALTER TABLE "OperationMember" DROP CONSTRAINT "OperationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "OperationUnit" DROP CONSTRAINT "OperationUnit_operationId_fkey";

-- DropForeignKey
ALTER TABLE "OperationUnit" DROP CONSTRAINT "OperationUnit_parentUnitId_fkey";

-- DropTable
DROP TABLE "Operation";

-- DropTable
DROP TABLE "OperationMember";

-- DropTable
DROP TABLE "OperationUnit";
