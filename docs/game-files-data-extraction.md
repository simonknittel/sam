# Extracting data from game files

1. Download latest version of <https://github.com/dolkensp/unp4k>
2. Extract data from `Roberts Space Industries\StarCitizen\LIVE\Data.p4k` using `unp4k.exe`
3. Extract data from `Roberts Space Industries\StarCitizen\LIVEData\Game2.dcb` using `unforge.cli.exe`
4. Run import script
	1. `cd pnpm-monorepo/apps/scripts`
	2. `DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" pnpm exec tsx src/game_data/v4.8.0.ts 4.8.0 LIVE /mnt/f/installed/Roberts\ Space\ Industries/StarCitizen/LIVE/Data`
