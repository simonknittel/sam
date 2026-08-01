/**
 * Save state of a wiki page and the stateless-message protocol carrying it
 * between the collab server (apps/collab) and the editor. The server is the
 * authority: it broadcasts the state whenever it changes (dirty on edits,
 * saving/saved around the debounced database store) and accepts a
 * force-save request that flushes a pending store immediately.
 */

export enum WikiSaveState {
  Dirty = "dirty",
  Saving = "saving",
  Saved = "saved",
}

/** Server → clients: the page's current save state */
export interface WikiCollabSaveStateMessage {
  readonly type: "saveState";
  readonly state: WikiSaveState;
}

/** Client → server: persist a pending debounced store immediately */
export interface WikiCollabForceSaveMessage {
  readonly type: "forceSave";
}

export type WikiCollabStatelessMessage =
  WikiCollabSaveStateMessage | WikiCollabForceSaveMessage;

export const serializeWikiCollabStatelessMessage = (
  message: WikiCollabStatelessMessage,
): string => JSON.stringify(message);

const SAVE_STATES = new Set<string>(Object.values(WikiSaveState));

/**
 * Parses an incoming stateless payload; NULL for anything that is not a
 * well-formed message (on the server the payload crosses a trust boundary).
 */
export const parseWikiCollabStatelessMessage = (
  payload: string,
): WikiCollabStatelessMessage | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const message = parsed as { type?: unknown; state?: unknown };
  if (message.type === "forceSave") return { type: "forceSave" };
  if (
    message.type === "saveState" &&
    typeof message.state === "string" &&
    SAVE_STATES.has(message.state)
  )
    return { type: "saveState", state: message.state as WikiSaveState };

  return null;
};
