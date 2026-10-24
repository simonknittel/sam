import { expect, test } from "vitest";
import {
  parseWikiCollabDisconnectTokenPayload,
  parseWikiCollabReplaceTokenPayload,
  parseWikiCollabSessionTokenPayload,
} from "./wikiCollabTokens.js";

const DISCONNECT_PAYLOAD = { scope: "disconnect", sub: "user-1" };
const SESSION_PAYLOAD = {
  scope: "session",
  sub: "user-1",
  pageId: "page-1",
  entityId: null,
  canEdit: true,
};
const REPLACE_PAYLOAD = { scope: "replace", pageId: "page-1", entityId: null };

test("a disconnect token gives the user", () => {
  expect(parseWikiCollabDisconnectTokenPayload(DISCONNECT_PAYLOAD)).toEqual(
    DISCONNECT_PAYLOAD,
  );
  expect(
    parseWikiCollabDisconnectTokenPayload({ scope: "disconnect", sub: "" }),
  ).toBeNull();
});

test("the token kinds do not authorize each other", () => {
  expect(parseWikiCollabDisconnectTokenPayload(SESSION_PAYLOAD)).toBeNull();
  expect(parseWikiCollabDisconnectTokenPayload(REPLACE_PAYLOAD)).toBeNull();
  expect(parseWikiCollabSessionTokenPayload(DISCONNECT_PAYLOAD)).toBeNull();
  expect(parseWikiCollabReplaceTokenPayload(DISCONNECT_PAYLOAD)).toBeNull();
});
