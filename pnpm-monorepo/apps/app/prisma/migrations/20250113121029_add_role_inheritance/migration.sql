-- CreateTable
CREATE TABLE "_inheritance" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_inheritance_AB_unique" ON "_inheritance"("A", "B");

-- CreateIndex
CREATE INDEX "_inheritance_B_index" ON "_inheritance"("B");

-- AddForeignKey
ALTER TABLE "_inheritance" ADD CONSTRAINT "_inheritance_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_inheritance" ADD CONSTRAINT "_inheritance_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
