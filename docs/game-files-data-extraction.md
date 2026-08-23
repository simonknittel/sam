# Extract data from the game files

1. Download the latest version of <https://github.com/dolkensp/unp4k>
2. Extract the data from `Roberts Space Industries\StarCitizen\LIVE\Data.p4k` with `unp4k.exe`
3. Extract the data from `Roberts Space Industries\StarCitizen\LIVE\Data\Game2.dcb` (a result of the previous step) with `unforge.cli.exe`
4. Run the import script
   1. `cd pnpm-monorepo`
   2. Build the workspace dependencies of the script: `pnpm run build:scripts`
   3. `cd apps/scripts`
   4. `DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" pnpm exec tsx src/game_data/v4.8.0.ts 4.8.0 LIVE /mnt/f/installed/Roberts\ Space\ Industries/StarCitizen/LIVE/Data`
