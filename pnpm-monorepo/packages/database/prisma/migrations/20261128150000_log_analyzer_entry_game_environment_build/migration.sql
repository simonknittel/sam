-- The names of the RSI Launcher: the game environment (for example LIVE) and the build number
ALTER TABLE "LogAnalyzerEntry" RENAME COLUMN "gameChannel" TO "gameEnvironment";
ALTER TABLE "LogAnalyzerEntry" RENAME COLUMN "gameVersion" TO "gameBuild";
