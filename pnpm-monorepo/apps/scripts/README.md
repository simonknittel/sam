# Scripts

This app contains one-time database migration scripts, game-data import scripts, search-index scripts (Algolia) and content-generation scripts.

## Usage

```sh
pnpm run build:scripts
cd apps/scripts

DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" pnpm exec tsx src/migrations/011-role-assignments.ts
DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" ALGOLIA_APP_ID="" ALGOLIA_ADMIN_API_KEY="" pnpm exec tsx src/algolia/spynet-entities-full-index.ts
```

## Game data import

The scripts in `src/game_data/` import ship and vehicle data that you extracted from the Star Citizen game files. See [docs/game-files-data-extraction.md](../../../docs/game-files-data-extraction.md) for the full extraction and import procedure.

## Wiki demo page

The script generates the Tiptap JSON for the "live demo page" of the wiki. The page uses each formatting option and embed. Import the output file through the JSON import of the wiki (page menu; it requires `wiki;manage` for global wiki pages, while event wiki pages check the page's admin access instead).

```sh
pnpm run build:scripts
cd apps/scripts

pnpm exec tsx src/wiki/demo-content.ts --help
pnpm exec tsx src/wiki/demo-content.ts --out wiki-demo-content.json
```

Nodes that point to real records (page links, citizen mentions, images, the file attachment, the Google document, tag ids) default to documented placeholders. Replace the placeholders through CLI flags or after the import. Put the host of the generic iframe on the iframe allowlist of the wiki before the import; without this, the wiki rejects the import.
