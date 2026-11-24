export interface OptOutChanges<Key> {
  readonly enabled: Key[];
  readonly disabled: Key[];
}

/**
 * A row switches its key off, and a key without a row is switched on. The save
 * sends the keys that are switched on.
 */
export const findOptOutChanges = <Key>(
  allKeys: readonly Key[],
  enabledKeys: Pick<ReadonlySet<Key>, "has">,
  switchedOffKeys: Pick<ReadonlySet<Key>, "has">,
): OptOutChanges<Key> => ({
  enabled: allKeys.filter(
    (key) => enabledKeys.has(key) && switchedOffKeys.has(key),
  ),
  disabled: allKeys.filter(
    (key) => !enabledKeys.has(key) && !switchedOffKeys.has(key),
  ),
});
