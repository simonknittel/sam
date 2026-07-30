-- CreateTable
CREATE TABLE "VariantTag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "VariantTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VariantToVariantTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantTag_key_value_key" ON "VariantTag"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "_VariantToVariantTag_AB_unique" ON "_VariantToVariantTag"("A", "B");

-- CreateIndex
CREATE INDEX "_VariantToVariantTag_B_index" ON "_VariantToVariantTag"("B");

-- AddForeignKey
ALTER TABLE "VariantTag" ADD CONSTRAINT "VariantTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantTag" ADD CONSTRAINT "VariantTag_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VariantToVariantTag" ADD CONSTRAINT "_VariantToVariantTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VariantToVariantTag" ADD CONSTRAINT "_VariantToVariantTag_B_fkey" FOREIGN KEY ("B") REFERENCES "VariantTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
