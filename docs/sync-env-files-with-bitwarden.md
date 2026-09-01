# Sync the .env files with Bitwarden

The script `scripts/sync-env-files-with-bitwarden.sh` copies the local `.env` files to your Bitwarden vault and back. Use it to move the `.env` files to a new machine, or to keep a backup of them.

The script handles each `.env` file in `pnpm-monorepo` that has a `.env.example` file next to it. Each `.env` file gets one Secure Note in Bitwarden. The name of the note is `SAM (local) | <path of the .env file>` (example: `SAM (local) | pnpm-monorepo/apps/app/.env`). The notes of the item contain the content of the file.

## Requirements

- The [Bitwarden CLI](https://bitwarden.com/help/cli/) (`bw`), logged in to your account
- [jq](https://jqlang.org/)

## Commands

Unlock the vault before you run the script, and lock it again after the script (see [Mirror the database](./mirror-database.md) for the same pattern):

- fish: `bwu && ./scripts/sync-env-files-with-bitwarden.sh <command>; bw lock`
- bash: `bwu && ./scripts/sync-env-files-with-bitwarden.sh <command>; bw lock`

| Command    | Description                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `upload`   | Copies the local `.env` files to Bitwarden. The script creates the items that do not exist and updates the items that changed. |
| `download` | Copies the `.env` files from Bitwarden to the local file system. The script overwrites the local files that changed.           |
| `diff`     | Shows the differences between the local `.env` files and the items in Bitwarden.                                               |

`upload` and `download` show the planned changes and ask for a confirmation. Add `--yes` to skip the confirmation.

## Limits

Bitwarden limits the notes of an item to 10,000 encrypted characters. This is approximately 7,000 characters of text. The upload of a larger `.env` file fails with an error from Bitwarden.
