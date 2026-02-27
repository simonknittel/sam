-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "DiscordEvent_endTime_idx" ON "DiscordEvent"("endTime");

-- CreateIndex
CREATE INDEX "DiscordEventParticipant_discordUserId_idx" ON "DiscordEventParticipant"("discordUserId");
