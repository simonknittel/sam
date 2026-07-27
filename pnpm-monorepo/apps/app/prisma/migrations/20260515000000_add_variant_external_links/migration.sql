-- CreateTable
CREATE TABLE "VariantExternalLink" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "VariantExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantExternalLink_variantId_serviceName_key" ON "VariantExternalLink"("variantId", "serviceName");

-- AddForeignKey
ALTER TABLE "VariantExternalLink" ADD CONSTRAINT "VariantExternalLink_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantExternalLink" ADD CONSTRAINT "VariantExternalLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantExternalLink" ADD CONSTRAINT "VariantExternalLink_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
