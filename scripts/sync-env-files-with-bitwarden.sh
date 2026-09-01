#!/bin/sh

# Copies the local .env files to Bitwarden and back. Run the script without
# arguments to see the usage.
# See `docs/sync-env-files-with-bitwarden.md` for more information

# Exit immediately if a command exits with a non-zero status.
set -e

REPOSITORY_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPOSITORY_ROOT"

# Same naming as the other SAM items in Bitwarden (see `docs/mirror-database.md`)
ITEM_NAME_PREFIX="SAM (local) | "

# Bitwarden item type "Secure Note" and secure note type "Generic"
# (https://bitwarden.com/help/cli/#create)
SECURE_NOTE_ITEM_TYPE=2
GENERIC_SECURE_NOTE_TYPE=0

usage() {
	cat <<USAGE
Usage:
  ./scripts/sync-env-files-with-bitwarden.sh upload [--yes]    Copy the local .env files to Bitwarden
  ./scripts/sync-env-files-with-bitwarden.sh download [--yes]  Copy the .env files from Bitwarden to the local file system
  ./scripts/sync-env-files-with-bitwarden.sh diff              Show the differences between the local .env files and Bitwarden

  --yes  Do not ask for a confirmation before the changes get applied
USAGE
}

fail() {
	printf '❌ %s\n' "$1" >&2
	exit 1
}

require_command() {
	command -v "$1" > /dev/null 2>&1 || fail "The command '$1' is not installed."
}

require_unlocked_vault() {
	case $(bw status | jq -r '.status') in
		unlocked) ;;
		unauthenticated) fail "You are not logged in to Bitwarden. Run 'bw login' first." ;;
		*) fail "The Bitwarden vault is locked. Run 'export BW_SESSION=\$(bw unlock --raw)' first." ;;
	esac
}

confirm() {
	[ "$ASSUME_YES" = 1 ] && return
	printf '%s [y/N] ' "$1"
	read -r answer
	case $answer in
		y | Y | yes | YES) ;;
		*)
			echo "Aborted."
			exit 1
			;;
	esac
}

# Each .env file that has a .env.example file next to it
env_files() {
	find pnpm-monorepo -name node_modules -prune -o -name .env.example -print | sed 's/\.example$//' | sort
}

item_name() {
	printf '%s%s' "$ITEM_NAME_PREFIX" "$1"
}

# Prints the Bitwarden item of the .env file, or nothing if the item does not exist
vault_item() {
	name=$(item_name "$1")
	matches=$(printf '%s' "$VAULT_ITEMS" | jq -c --arg name "$name" '[.[] | select(.name == $name)]')
	count=$(printf '%s' "$matches" | jq 'length')
	[ "$count" -le 1 ] || fail "Bitwarden has $count items with the name '$name'. Remove the duplicates first."
	printf '%s' "$matches" | jq -c '.[0] // empty'
}

vault_item_notes() {
	printf '%s' "$1" | jq -j '.notes // ""'
}

# Exit status 0 if the notes of the Bitwarden item are identical to the file
item_matches_file() {
	vault_item_notes "$1" | cmp -s - "$2"
}

upload_action() {
	[ -f "$1" ] || { echo "skip"; return; }
	item=$(vault_item "$1")
	[ -n "$item" ] || { echo "create"; return; }
	if item_matches_file "$item" "$1"; then echo "unchanged"; else echo "update"; fi
}

upload_file() {
	name=$(item_name "$1")
	case $(upload_action "$1") in
		create)
			encoded=$(jq -n --arg name "$name" --rawfile notes "$1" --argjson itemType "$SECURE_NOTE_ITEM_TYPE" --argjson noteType "$GENERIC_SECURE_NOTE_TYPE" \
				'{type: $itemType, secureNote: {type: $noteType}, name: $name, notes: $notes}' | bw encode)
			# The output of the Bitwarden CLI contains the notes (the content of the .env file)
			bw create item "$encoded" > /dev/null
			;;
		update)
			item=$(vault_item "$1")
			id=$(printf '%s' "$item" | jq -r '.id')
			encoded=$(printf '%s' "$item" | jq --rawfile notes "$1" '.notes = $notes' | bw encode)
			# The output of the Bitwarden CLI contains the notes (the content of the .env file)
			bw edit item "$id" "$encoded" > /dev/null
			;;
	esac
}

upload() {
	changes=0
	for env_file in $(env_files); do
		action=$(upload_action "$env_file")
		case $action in
			skip) printf '%s: skip (no local file)\n' "$env_file" ;;
			create) printf '%s: create Bitwarden item "%s"\n' "$env_file" "$(item_name "$env_file")" ;;
			update) printf '%s: update Bitwarden item "%s"\n' "$env_file" "$(item_name "$env_file")" ;;
			unchanged) printf '%s: unchanged\n' "$env_file" ;;
		esac
		case $action in create | update) changes=$((changes + 1)) ;; esac
	done
	[ "$changes" -gt 0 ] || { echo "Nothing to do."; return; }
	confirm "Apply $changes change(s) to Bitwarden?"
	for env_file in $(env_files); do
		upload_file "$env_file"
	done
	echo "✅ Successfully uploaded the .env files to Bitwarden"
}

download_action() {
	item=$(vault_item "$1")
	[ -n "$item" ] || { echo "skip"; return; }
	[ -f "$1" ] || { echo "create"; return; }
	if item_matches_file "$item" "$1"; then echo "unchanged"; else echo "update"; fi
}

download_file() {
	case $(download_action "$1") in
		create | update) vault_item_notes "$(vault_item "$1")" > "$1" ;;
	esac
}

download() {
	changes=0
	for env_file in $(env_files); do
		action=$(download_action "$env_file")
		case $action in
			skip) printf '%s: skip (no Bitwarden item "%s")\n' "$env_file" "$(item_name "$env_file")" ;;
			create) printf '%s: create local file\n' "$env_file" ;;
			update) printf '%s: overwrite local file\n' "$env_file" ;;
			unchanged) printf '%s: unchanged\n' "$env_file" ;;
		esac
		case $action in create | update) changes=$((changes + 1)) ;; esac
	done
	[ "$changes" -gt 0 ] || { echo "Nothing to do."; return; }
	confirm "Apply $changes change(s) to the local .env files?"
	for env_file in $(env_files); do
		download_file "$env_file"
	done
	echo "✅ Successfully downloaded the .env files from Bitwarden"
}

diff_files() {
	for env_file in $(env_files); do
		name=$(item_name "$env_file")
		item=$(vault_item "$env_file")
		printf '### %s\n' "$env_file"
		if [ -z "$item" ] && [ ! -f "$env_file" ]; then
			echo "Neither a local file nor a Bitwarden item exists."
		elif [ -z "$item" ]; then
			echo "Only the local file exists."
		elif [ ! -f "$env_file" ]; then
			printf 'Only the Bitwarden item "%s" exists.\n' "$name"
		elif item_matches_file "$item" "$env_file"; then
			echo "Identical."
		else
			# diff exits with status 1 when the files differ
			vault_item_notes "$item" | diff -u --label "Bitwarden: $name" --label "local: $env_file" - "$env_file" || :
		fi
		echo
	done
}

COMMAND=$1
[ $# -eq 0 ] || shift
ASSUME_YES=0
for argument in "$@"; do
	case $argument in
		--yes) ASSUME_YES=1 ;;
		*)
			usage >&2
			exit 2
			;;
	esac
done
case $COMMAND in
	upload | download | diff) ;;
	*)
		usage >&2
		exit 2
		;;
esac

require_command bw
require_command jq
require_unlocked_vault
bw sync
# Only the items of this script. The output of `bw list items` contains the decrypted secrets of every item in the vault.
VAULT_ITEMS=$(bw list items | jq -c --arg prefix "$ITEM_NAME_PREFIX" '[.[] | select(.name | startswith($prefix))]')

case $COMMAND in
	upload) upload ;;
	download) download ;;
	diff) diff_files ;;
esac
