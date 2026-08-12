import { describe, expect, test } from "vitest";
import {
  WikiSaveState,
  parseWikiCollabStatelessMessage,
  serializeWikiCollabStatelessMessage,
} from "./index.js";

describe("parseWikiCollabStatelessMessage", () => {
  test("round-trips both message types", () => {
    expect(
      parseWikiCollabStatelessMessage(
        serializeWikiCollabStatelessMessage({ type: "forceSave" }),
      ),
    ).toEqual({ type: "forceSave" });

    expect(
      parseWikiCollabStatelessMessage(
        serializeWikiCollabStatelessMessage({
          type: "saveState",
          state: WikiSaveState.Saving,
        }),
      ),
    ).toEqual({ type: "saveState", state: WikiSaveState.Saving });
  });

  test("rejects malformed payloads", () => {
    expect(parseWikiCollabStatelessMessage("not json")).toBeNull();
    expect(parseWikiCollabStatelessMessage("null")).toBeNull();
    expect(parseWikiCollabStatelessMessage('"forceSave"')).toBeNull();
    expect(parseWikiCollabStatelessMessage('{"type":"unknown"}')).toBeNull();
    expect(parseWikiCollabStatelessMessage('{"type":"saveState"}')).toBeNull();
    expect(
      parseWikiCollabStatelessMessage('{"type":"saveState","state":"nope"}'),
    ).toBeNull();
  });
});
