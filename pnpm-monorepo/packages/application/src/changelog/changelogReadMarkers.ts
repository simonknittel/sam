import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext, TrackedChangelogEntry } from "../context.js";

/** Empty when the host has no changelog */
const listTrackedEntries = (context: ApplicationContext) =>
  context.changelog?.listTrackedEntries() ?? [];

/**
 * Of the given keys, the keys of tracked entries. The keys are checked
 * against all tracked entries, without the cutoff of the actor: the changelog
 * page observes fewer entries, thus do not replace the list with the list of
 * the page.
 */
export const findTrackedChangelogEntryKeys = (
  context: ApplicationContext,
  keys: readonly string[],
): string[] => {
  const trackedKeys = new Set(
    listTrackedEntries(context).map((entry) => entry.key),
  );

  return keys.filter((key) => trackedKeys.has(key));
};

/**
 * Entries published before a citizen joined are not new to them, so only
 * entries of the confirmation day itself and later are tracked. Citizens
 * without a confirmed email (admins bypassing the confirmation) have no
 * cutoff and see every tracked entry as new.
 */
const findTrackedKeysSince = (
  trackedEntries: readonly TrackedChangelogEntry[],
  emailConfirmedAt: Date | null,
): string[] => {
  const cutoffDate = emailConfirmedAt
    ? getLocalDateKey(emailConfirmedAt, ORGANIZATION_TIMEZONE)
    : null;

  return trackedEntries
    .filter((entry) => !cutoffDate || entry.date >= cutoffDate)
    .map((entry) => entry.key);
};

/**
 * The keys of the tracked entries which are new for the actor, in the order
 * of the tracked entries. Only the given keys, or all keys without them.
 */
const findNewKeys = async (
  context: ApplicationContext,
  actor: Actor,
  keys: readonly string[] | null,
): Promise<string[]> => {
  const citizenId = actor.citizen?.id;
  if (!citizenId) return [];

  const candidateKeys = keys ? new Set(keys) : null;
  const trackedKeys = findTrackedKeysSince(
    listTrackedEntries(context),
    actor.emailConfirmedAt,
  ).filter((key) => !candidateKeys || candidateKeys.has(key));
  if (trackedKeys.length === 0) return [];

  const markers = await context.prisma.readMarker.findMany({
    where: { citizenId, changelogEntryKey: { in: trackedKeys } },
    select: { changelogEntryKey: true },
  });
  const readKeys = new Set(markers.map((marker) => marker.changelogEntryKey));

  return trackedKeys.filter((key) => !readKeys.has(key));
};

/** Of the given keys, the keys of the entries which are new for the actor */
export const findNewChangelogEntryKeys = (
  context: ApplicationContext,
  actor: Actor,
  keys: readonly string[],
) => findNewKeys(context, actor, keys);

/** The number of the entries which are new for the actor */
export const countNewChangelogEntries = async (
  context: ApplicationContext,
  actor: Actor,
) => (await findNewKeys(context, actor, null)).length;
