-- CreateTable
CREATE TABLE "DiscordEventSubscriber" (
    "userId" TEXT NOT NULL,
    "newEvent" BOOLEAN NOT NULL DEFAULT false,
    "updatedEvent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiscordEventSubscriber_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "DiscordEventSubscriber" ADD CONSTRAINT "DiscordEventSubscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
