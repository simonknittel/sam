-- AlterTable
ALTER TABLE "_VariantToVariantTag" ADD CONSTRAINT "_VariantToVariantTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_VariantToVariantTag_AB_unique";

-- AlterTable
ALTER TABLE "_inheritance" ADD CONSTRAINT "_inheritance_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_inheritance_AB_unique";
