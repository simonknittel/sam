-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "hiddenForOtherRoles" BOOLEAN;

-- CreateTable
CREATE TABLE "_requiredRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_requiredRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_requiredRoles_B_index" ON "_requiredRoles"("B");

-- AddForeignKey
ALTER TABLE "_requiredRoles" ADD CONSTRAINT "_requiredRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_requiredRoles" ADD CONSTRAINT "_requiredRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
