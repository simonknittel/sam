-- DropIndex
DROP INDEX "EmailConfirmationToken_userId_email_key";

-- AlterTable
ALTER TABLE "EmailConfirmationToken" ADD CONSTRAINT "EmailConfirmationToken_pkey" PRIMARY KEY ("token");

-- DropIndex
DROP INDEX "EmailConfirmationToken_token_key";
