-- CreateTable
CREATE TABLE "CitizenAppFavorite" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "appKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenAppFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitizenAppFavorite_citizenId_appKey_key" ON "CitizenAppFavorite"("citizenId", "appKey");

-- AddForeignKey
ALTER TABLE "CitizenAppFavorite" ADD CONSTRAINT "CitizenAppFavorite_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
