# Scripts

This app contains one-time database migration scripts, game-data import scripts and content-generation scripts.

## Usage

```sh
pnpm run build:scripts
cd apps/scripts

DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" pnpm exec tsx src/migrations/011-role-assignments.ts
DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" ALGOLIA_APP_ID="" ALGOLIA_ADMIN_API_KEY="" pnpm exec tsx src/algolia/spynet-entities-full-index.ts
```

## Game data import

The scripts in `src/game_data/` import ship and vehicle data extracted from the Star Citizen game files. See [docs/game-files-data-extraction.md](../../../docs/game-files-data-extraction.md) for the full extraction and import walkthrough.

## Wiki demo page

Generates the Tiptap JSON for the wiki's "live demo page" exercising every formatting option and embed. Import the output file via the wiki's JSON import (page menu, requires `wiki;manage`).

```sh
pnpm run build:scripts
cd apps/scripts

pnpm exec tsx src/wiki/demo-content.ts --help
pnpm exec tsx src/wiki/demo-content.ts --out wiki-demo-content.json
```

Nodes referencing real records (page links, citizen mentions, images, the file attachment, the Google document, tag ids) default to documented placeholders — replace them via CLI flags or after import. The generic iframe's host must be on the wiki's iframe allowlist before importing, otherwise the import is rejected.
