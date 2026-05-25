-- CreateTable
CREATE TABLE "ChangelogEntrySeen" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "ChangelogEntrySeen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "gameVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintUnlock" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangelogEntrySeen_citizenId_idx" ON "ChangelogEntrySeen"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogEntrySeen_citizenId_key_key" ON "ChangelogEntrySeen"("citizenId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GameVersion_channel_version_key" ON "GameVersion"("channel", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Item_gameVersionId_key_key" ON "Item"("gameVersionId", "key");

-- AddForeignKey
ALTER TABLE "ChangelogEntrySeen" ADD CONSTRAINT "ChangelogEntrySeen_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_gameVersionId_fkey" FOREIGN KEY ("gameVersionId") REFERENCES "GameVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintUnlock" ADD CONSTRAINT "BlueprintUnlock_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintUnlock" ADD CONSTRAINT "BlueprintUnlock_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
