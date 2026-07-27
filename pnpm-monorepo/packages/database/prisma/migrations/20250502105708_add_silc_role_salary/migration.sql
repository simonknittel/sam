-- CreateTable
CREATE TABLE "SilcRoleSalary" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,

    CONSTRAINT "SilcRoleSalary_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SilcRoleSalary" ADD CONSTRAINT "SilcRoleSalary_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
