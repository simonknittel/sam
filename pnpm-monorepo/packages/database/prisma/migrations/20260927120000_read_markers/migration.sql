-- Generic read markers: a row records that a citizen has read an item. Each
-- subject type (task, event, ...) has its own nullable foreign key column. The
-- hand-written CHECK constraint at the bottom keeps the "exactly one subject"
-- invariant that the application relies on.

-- CreateTable
CREATE TABLE "ReadMarker" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT,
    "eventId" TEXT,

    CONSTRAINT "ReadMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadMarker_citizenId_idx" ON "ReadMarker"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadMarker_taskId_citizenId_key" ON "ReadMarker"("taskId", "citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadMarker_eventId_citizenId_key" ON "ReadMarker"("eventId", "citizenId");

-- AddForeignKey
ALTER TABLE "ReadMarker" ADD CONSTRAINT "ReadMarker_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadMarker" ADD CONSTRAINT "ReadMarker_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadMarker" ADD CONSTRAINT "ReadMarker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each marker belongs to exactly one subject. A new subject type adds its
-- column to this list in its own migration.
ALTER TABLE "ReadMarker" ADD CONSTRAINT "ReadMarker_subject_check" CHECK (
  num_nonnulls("taskId", "eventId") = 1
);
