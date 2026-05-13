-- CreateTable
CREATE TABLE "_eventManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_eventManagers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_eventManagers_B_index" ON "_eventManagers"("B");

-- AddForeignKey
ALTER TABLE "_eventManagers" ADD CONSTRAINT "_eventManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventManagers" ADD CONSTRAINT "_eventManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
